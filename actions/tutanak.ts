"use server";

import { createClient } from "@/lib/supabase/server";
import { google } from "googleapis";
import { TutanakFile } from "@/app/types/tutanak";
import { TutanakTemplate, WorkspaceType } from "@/app/types/employee";

async function ensureFolderPath(drive: import("googleapis").drive_v3.Drive, parentId: string, pathFields: string[]): Promise<string> {
  let currentParentId = parentId;

  for (const folderName of pathFields) {
    const q = `'${currentParentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await drive.files.list({
      q,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (response.data.files && response.data.files.length > 0) {
      currentParentId = response.data.files[0].id!;
    } else {
      const folderMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [currentParentId],
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
        supportsAllDrives: true,
      });

      currentParentId = folder.data.id!;

      await drive.permissions.create({
        fileId: currentParentId,
        requestBody: {
          type: "anyone",
          role: "reader",
        },
        supportsAllDrives: true,
      });
    }
  }

  return currentParentId;
}

export async function generateTutanak(formData: FormData) {
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

    const workspace = Array.isArray(profile.workspaces) ? profile.workspaces[0] : profile.workspaces;

    if (!workspace.drive_folder_id) {
      return { error: "Çalışma alanına ait Google Drive klasörü bulunamadı." };
    }

    if (!workspace.google_refresh_token) {
      return { error: "Google Drive bağlantısı bulunamadı.", resetAuth: true };
    }

    // 1. Google Auth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: workspace.google_refresh_token,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const docs = google.docs({ version: "v1", auth: oauth2Client });

    // 2. Tutanak klasörünün yolunu doğrula (Anex/Tutanak)
    const tutanakFolderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Tutanak']);

    // 3. Tutanak Taslak dosyasını bul
    const q = `'${tutanakFolderId}' in parents and name = 'Tutanak_Taslak' and mimeType = 'application/vnd.google-apps.document' and trashed=false`;
    const searchResponse = await drive.files.list({
      q,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    let templateId = searchResponse.data.files?.[0]?.id;

    if (!templateId) {
       // If no template, we might need to handle it or create an empty one.
       // Let's create an empty template document for fallback
       const doc = await docs.documents.create({ requestBody: { title: "Tutanak_Taslak" } });
       templateId = doc.data.documentId!;

       // Move to correct folder
       await drive.files.update({
         fileId: templateId,
         addParents: tutanakFolderId,
         fields: 'id, parents',
         supportsAllDrives: true,
       });

       // Now add default content (Very basic text)
       await docs.documents.batchUpdate({
         documentId: templateId,
         requestBody: {
           requests: [
             { insertText: { location: { index: 1 }, text: "TUTANAK\n\nNumara: {{Numara}}\nTarih: {{Tutanak_Tarihi}}\nKonu: {{Konu}}\nOtel: {{Otel}}\n\nPersonel Adı: {{Adı_Soyadı}}\nDepartman/Pos: {{Dep_Pos}}\n\nOlay Yeri: {{Olay_Yeri}}\n\nAçıklama:\n{{Tutanak_Açıklama}}\n\nHazırlayan:\n{{Hazırlayan}}\n" } }
           ]
         }
       });
    }

    // 4. Form verilerini al
    const konu = formData.get("konu") as string;
    const adSoyad = formData.get("adSoyad") as string;
    const depPos = formData.get("depPos") as string;
    const olayTarihiRaw = formData.get("olayTarihi") as string;
    const olayYeri = formData.get("olayYeri") as string;
    const aciklamaRaw = formData.get("aciklama") as string;

    if (!konu || !adSoyad || !olayTarihiRaw || !aciklamaRaw) {
      return { error: "Lütfen gerekli alanları doldurun." };
    }

    // Replace newlines with soft returns or multiple requests to preserve formatting.
    // For simplicity, we just pass the string. Docs API might need special handling for \n,
    // but a direct replaceText handles simple multiline strings reasonably.
    const aciklama = aciklamaRaw;

    // Generate unique number
    // We can use current date + random or fetch count
    const d = new Date();
    const tutanakNumber = `T-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const olayTarihi = new Date(olayTarihiRaw).toLocaleString('tr-TR');

    const hazirlayan = `${profile.first_name} ${profile.last_name}`;
    const otel = workspace.hotel_name || workspace.name || "Anex Hotels";
    const documentName = `Tutanak - ${adSoyad} - ${tutanakNumber}`;

    // 5. Copy the template document
    let newDocumentId;
    try {
      const copyResponse = await drive.files.copy({
        fileId: templateId,
        requestBody: {
          name: documentName,
          parents: [tutanakFolderId],
        },
        supportsAllDrives: true,
      });
      newDocumentId = copyResponse.data.id;
    } catch (e) {
      console.error("Copy template error:", e);
      return { error: "Şablon kopyalanamadı." };
    }

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
      console.error("Database insert error (tutanaks):", insertError);
    }



    // 9. Return URL
    return { success: true, documentUrl };
  } catch (error: unknown) {
    console.error("Error generating Tutanak:", error);

    const err = error as { response?: { status?: number }, message?: string };

    // Self-healing: if token is revoked or expired
    if (err?.response?.status === 401 || err?.response?.status === 403 || err?.message?.includes("invalid_grant")) {
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

    const workspace = Array.isArray(profile.workspaces) ? profile.workspaces[0] : profile.workspaces;

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
  } catch (error: unknown) {
    console.error("Error fetching Tutanak files:", error);

    const err = error as { response?: { status?: number }, message?: string };

    // Self-healing: if token is revoked or expired
    if (err?.response?.status === 401 || err?.response?.status === 403 || err?.message?.includes("invalid_grant")) {
      return { error: "Google Drive oturumunuzun süresi doldu veya erişim izni iptal edildi. Lütfen tekrar giriş yapın.", resetAuth: true };
    }

    return { error: error instanceof Error ? error.message : "Dosyalar alınırken beklenmeyen bir hata oluştu." };
  }
}

export async function getTutanakFormOptions() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Kullanıcı girişi yapılmamış." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id, workspaces(name, hotel_name, drive_folder_id)")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.workspace_id) {
      return { error: "Çalışma alanı (Workspace) bulunamadı." };
    }

    const [employeesResponse, templatesResponse] = await Promise.all([
      supabase.from("employees").select("id, full_name, role_title, department_outlet").eq("workspace_id", profile.workspace_id).eq("is_active", true).order("full_name"),
      supabase.from("tutanak_templates").select("*").eq("workspace_id", profile.workspace_id).order("title"),
    ]);

    let templates = (templatesResponse.data || []) as TutanakTemplate[];

    // Self-healing: Seed default templates if none exist for this workspace
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          workspace_id: profile.workspace_id,
          category: 'Devamsızlık',
          title: 'Hastalık - Haber Verdi',
          content: '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) rahatsızlandığını ve işe gelemeyeceğini önceden bildirmiştir. Bu tutanak, personelin haberli devamsızlığını kayıt altına almak amacıyla düzenlenmiştir.'
        },
        {
          workspace_id: profile.workspace_id,
          category: 'Devamsızlık',
          title: 'Hastalık - Haber Vermedi',
          content: '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) mesaisine gelmemiş ve mazeret bildirmemiştir. Personelin habersiz devamsızlığı tespit edilmiş olup, işbu tutanak imza altına alınmıştır.'
        },
        {
          workspace_id: profile.workspace_id,
          category: 'Devamsızlık',
          title: 'İşe Geç Kalma',
          content: '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) mesai saatine uymamış ve işe geç kalmıştır. Personelin gecikmesi tespit edilmiş olup bu tutanak düzenlenmiştir.'
        },
        {
          workspace_id: profile.workspace_id,
          category: 'Devamsızlık',
          title: 'İzinsiz Görev Yeri Terki',
          content: '{{tarih}} tarihinde personel {{personel_adi}} ({{gorevi}}) mesai saatleri içerisinde amirinden izin almaksızın görev yerini terk etmiştir. Bu durum tespit edilmiş olup işbu tutanak düzenlenmiştir.'
        }
      ];

      const { data: insertedTemplates, error: insertError } = await supabase
        .from('tutanak_templates')
        .insert(defaultTemplates)
        .select('*');

      if (!insertError && insertedTemplates) {
        templates = insertedTemplates as TutanakTemplate[];
      } else {
        console.error("Error seeding default tutanak templates:", insertError);
      }
    }

    const getWorkspaceData = () => {
      if (!profile.workspaces) return { name: "", hotel_name: "", drive_folder_id: "" };
      const ws = (Array.isArray(profile.workspaces) ? profile.workspaces[0] : profile.workspaces) as WorkspaceType;

      return {
        name: ws?.name || "",
        hotel_name: ws?.hotel_name || "",
        drive_folder_id: ws?.drive_folder_id || ""
      };
    };

    const wsData = getWorkspaceData();

    return {
      employees: employeesResponse.data || [],
      templates: templates,
      workspaceName: wsData.name,
      hotelName: wsData.hotel_name || wsData.name || "Anex Hotels",
      driveFolderId: wsData.drive_folder_id,
    };
  } catch (error) {
    console.error("Error fetching form options:", error);
    return { error: "Veriler alınırken beklenmeyen bir hata oluştu." };
  }
}
