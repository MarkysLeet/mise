"use server";

import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { ensureFolderPath } from "@/lib/google-drive";

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

    if (!workspace.google_refresh_token) {
      return { error: "Google Drive bağlantısı bulunamadı. Lütfen hesabınızı bağlayın.", resetAuth: true };
    }

    // 3. Initialize googleapis
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: workspace.google_refresh_token,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const docs = google.docs({ version: "v1", auth: oauth2Client });

    const masterFolderId = process.env.GOOGLE_MASTER_FOLDER_ID;
    if (!masterFolderId) {
      return { error: "Google Master Folder ID yapılandırılmamış." };
    }

    // 4. Ensure target folder exists and find the template file
    const tutanakFolderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Tutanak']);

    // Search for the template file 'Tutanak_Taslak' in the user's Anex/Tutanak folder
    const query = `name='Tutanak_Taslak' and '${tutanakFolderId}' in parents and trashed=false`;
    const searchResponse = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    let templateFile = searchResponse.data.files?.[0];

    // Fallback: If not found in user's Anex/Tutanak folder, copy from master folder
    if (!templateFile || !templateFile.id) {
      const masterSearchResponse = await drive.files.list({
        q: `name='Tutanak_Taslak' and trashed=false and '${masterFolderId}' in parents`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      let masterTemplate = masterSearchResponse.data.files?.[0];

      // Secondary fallback if it's not directly in the master root but deeper
      if (!masterTemplate || !masterTemplate.id) {
         const globalMasterSearchResponse = await drive.files.list({
           q: `name='Tutanak_Taslak' and trashed=false`,
           fields: "files(id, name, parents)",
           supportsAllDrives: true,
           includeItemsFromAllDrives: true,
         });

         const files = globalMasterSearchResponse.data.files;
         if (files && files.length > 0) {
           for (const file of files) {
             if (!file.id) continue;
             let currentFile = file;
             let isBelongingToMaster = false;

             for (let i = 0; i < 5; i++) {
               if (!currentFile.parents || currentFile.parents.length === 0) break;
               if (currentFile.parents.includes(masterFolderId)) {
                 isBelongingToMaster = true;
                 break;
               }
               try {
                 const parentRes = await drive.files.get({
                   fileId: currentFile.parents[0],
                   fields: "id, parents",
                   supportsAllDrives: true,
                 });
                 currentFile = parentRes.data;
               } catch { break; }
             }

             if (isBelongingToMaster) {
               masterTemplate = file;
               break;
             }
           }
         }
      }

      if (!masterTemplate || !masterTemplate.id) {
        return { error: "Şablon dosyası ('Tutanak_Taslak') kullanıcının klasöründe ve Master klasörde bulunamadı." };
      }

      // Copy from master to user's Anex/Tutanak folder
      const copyTemplateRes = await drive.files.copy({
        fileId: masterTemplate.id,
        requestBody: {
          name: 'Tutanak_Taslak',
          parents: [tutanakFolderId],
        },
        supportsAllDrives: true,
      });

      if (!copyTemplateRes.data.id) {
         return { error: "Şablon dosyası kopyalanamadı." };
      }

      templateFile = { id: copyTemplateRes.data.id, name: 'Tutanak_Taslak' };
    }

    // Form Data Extraction
    const kategori = formData.get("kategori") as string || "";
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
    const otel = workspace.hotel_name || workspace.hotel_group || "Anex Hotels";

    // 5. Copy the file to the user's folder
    const safeDate = new Date().toISOString().split('T')[0];
    const kategoriPrefix = kategori ? `[${kategori}] ` : "";
    const newFileName = `${kategoriPrefix}Tutanak - ${adSoyad} - ${safeDate}`;

    if (!templateFile.id) {
       return { error: "Şablon dosyası id'si eksik." };
    }

    const copyResponse = await drive.files.copy({
      fileId: templateFile.id,
      requestBody: {
        name: newFileName,
        parents: [tutanakFolderId],
      },
      supportsAllDrives: true,
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
      supportsAllDrives: true,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error generating Tutanak:", error);

    // Self-healing: if token is revoked or expired
    if (error?.response?.status === 401 || error?.response?.status === 403 || error?.message?.includes("invalid_grant")) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", user.id).single();
          if (profile && profile.workspace_id) {
            const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
            const supabaseAdmin = createSupabaseClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            await supabaseAdmin.from("workspaces").update({
              is_onboarded: false,
              google_refresh_token: null
            }).eq("id", profile.workspace_id);

            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              user_metadata: { ...user.user_metadata, is_onboarded: false }
            });
          }
        }
      } catch (e) {
        console.error("Error resetting auth state:", e);
      }
      return { error: "Google Drive oturumunuzun süresi doldu veya erişim izni iptal edildi. Lütfen tekrar giriş yapın.", resetAuth: true };
    }

    return { error: error instanceof Error ? error.message : "Tutanak oluşturulurken beklenmeyen bir hata oluştu." };
  }
}

export type TutanakFile = {
  id: string;
  name: string;
  createdTime: string;
  webViewLink: string;
};

export async function getTutanakFiles(): Promise<{ files?: TutanakFile[]; error?: string; resetAuth?: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Kullanıcı girişi yapılmamış." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, workspaces(*)")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.workspaces) {
      return { error: "Çalışma alanı (Workspace) bulunamadı." };
    }

    const workspace = profile.workspaces;

    if (!workspace.drive_folder_id) {
      return { error: "Çalışma alanına ait Google Drive klasörü bulunamadı." };
    }

    if (!workspace.google_refresh_token) {
      return { error: "Google Drive bağlantısı bulunamadı.", resetAuth: true };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: workspace.google_refresh_token,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const tutanakFolderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Tutanak']);

    // List all files inside the Anex/Tutanak folder excluding the template itself and trashed items
    // Order by createdTime descending
    const response = await drive.files.list({
      q: `'${tutanakFolderId}' in parents and name != 'Tutanak_Taslak' and trashed=false`,
      fields: "files(id, name, createdTime, webViewLink)",
      orderBy: "createdTime desc",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files?.map(file => ({
      id: file.id as string,
      name: file.name as string,
      createdTime: file.createdTime as string,
      webViewLink: file.webViewLink as string,
    })) || [];

    return { files };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error fetching Tutanak files:", error);

    // Self-healing: if token is revoked or expired
    if (error?.response?.status === 401 || error?.response?.status === 403 || error?.message?.includes("invalid_grant")) {
      return { error: "Google Drive oturumunuzun süresi doldu veya erişim izni iptal edildi. Lütfen tekrar giriş yapın.", resetAuth: true };
    }

    return { error: error instanceof Error ? error.message : "Dosyalar alınırken beklenmeyen bir hata oluştu." };
  }
}
