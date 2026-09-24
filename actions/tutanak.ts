"use server";

import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";

export async function generateTutanak(formData: FormData) {
  try {
    // 1. Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Kullanıcı girişi yapılmamış." };
    }

    // Get user's profile and workspace
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, workspaces(*)")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { error: "Kullanıcı profili bulunamadı." };
    }

    const workspace = profile.workspaces;

    if (!workspace) {
      return { error: "Çalışma alanı (Workspace) bulunamadı." };
    }

    if (!workspace.drive_folder_id) {
      return { error: "Çalışma alanına ait Google Drive klasörü bulunamadı. Lütfen yöneticinizle iletişime geçin." };
    }

    // 2. Generate Tutanak Number
    const tutanakNumber = "T-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    // 3. Initialize googleapis
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
    });

    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const masterFolderId = process.env.GOOGLE_MASTER_FOLDER_ID;
    if (!masterFolderId) {
      return { error: "Google Master Folder ID yapılandırılmamış." };
    }

    // 4. Find the template file 'Tutanak_Taslak'
    const query = `name='Tutanak_Taslak' and trashed=false`;
    const searchResponse = await drive.files.list({
      q: query,
      fields: "files(id, name)",
    });

    const templateFile = searchResponse.data.files?.[0];
    if (!templateFile || !templateFile.id) {
      return { error: "Şablon dosyası ('Tutanak_Taslak') bulunamadı." };
    }

    // Form Data Extraction
    const konu = formData.get("konu") as string || "";
    const olayYeri = formData.get("olayYeri") as string || "";
    const adSoyad = formData.get("adSoyad") as string || "";
    const depPos = formData.get("depPos") as string || "";

    const olayTarihiRaw = formData.get("olayTarihi") as string || "";
    let olayTarihi = olayTarihiRaw;
    if (olayTarihiRaw) {
      const dateObj = new Date(olayTarihiRaw);
      olayTarihi = dateObj.toLocaleString("tr-TR");
    }

    const aciklama = formData.get("aciklama") as string || "";

    const hazirlayan = `${profile.first_name} ${profile.last_name}`;
    const otel = workspace.hotel_group || "Anex Hotels";

    // 5. Copy the file to the user's folder
    const safeDate = new Date().toISOString().split('T')[0];
    const newFileName = `Tutanak - ${adSoyad} - ${safeDate}`;

    const copyResponse = await drive.files.copy({
      fileId: templateFile.id,
      requestBody: {
        name: newFileName,
        parents: [workspace.drive_folder_id],
      },
    });

    const newDocumentId = copyResponse.data.id;
    if (!newDocumentId) {
      return { error: "Dosya kopyalanamadı." };
    }

    // 6. Replace placeholders
    const requests = [
      { replaceAllText: { containsText: { text: "{{Numara}}", matchCase: true }, replaceText: tutanakNumber } },
      { replaceAllText: { containsText: { text: "{{Tutanak_Açıklama}}", matchCase: true }, replaceText: aciklama } },
      { replaceAllText: { containsText: { text: "{{Tutanak_Tarihi}}", matchCase: true }, replaceText: olayTarihi } },
      { replaceAllText: { containsText: { text: "{{Olay_Yeri}}", matchCase: true }, replaceText: olayYeri } },
      { replaceAllText: { containsText: { text: "{{Adı_Soyadı}}", matchCase: true }, replaceText: adSoyad } },
      { replaceAllText: { containsText: { text: "{{Dep_Pos}}", matchCase: true }, replaceText: depPos } },
      { replaceAllText: { containsText: { text: "{{Hazırlayan}}", matchCase: true }, replaceText: hazirlayan } },
      { replaceAllText: { containsText: { text: "{{Konu}}", matchCase: true }, replaceText: konu } },
      { replaceAllText: { containsText: { text: "{{Otel}}", matchCase: true }, replaceText: otel } },
    ];

    await docs.documents.batchUpdate({
      documentId: newDocumentId,
      requestBody: {
        requests,
      },
    });

    // 7. Give read permissions
    await drive.permissions.create({
      fileId: newDocumentId,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    const documentUrl = `https://docs.google.com/document/d/${newDocumentId}/edit`;

    // 8. Log to database
    const { error: insertError } = await supabase.from("tutanaks").insert({
      workspace_id: workspace.id,
      created_by: profile.id,
      document_url: documentUrl,
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      // We don't necessarily want to fail here if the document was created successfully, but we log it.
    }

    // 9. Return URL
    return { success: true, documentUrl };
  } catch (error: unknown) {
    console.error("Error generating Tutanak:", error);
    return { error: error instanceof Error ? error.message : "Tutanak oluşturulurken beklenmeyen bir hata oluştu." };
  }
}
