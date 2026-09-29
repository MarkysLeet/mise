"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { redirect } from "next/navigation";

// Service client needed to update user_metadata
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractFolderId(input: string): string {
  const cleanInput = input.trim();
  let match = cleanInput.match(/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  match = cleanInput.match(/id=([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  match = cleanInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  const finalMatch = cleanInput.match(/^([a-zA-Z0-9-_]+)$/);
  if (finalMatch && finalMatch[1]) return finalMatch[1];
  return cleanInput;
}

async function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Drive credentials.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

export async function checkDriveFolderAccess(folderLink: string) {
  const folderId = extractFolderId(folderLink);

  try {
    const drive = await getDriveClient();
    await drive.files.get({
      fileId: folderId,
      fields: "id, name",
      supportsAllDrives: true,
    });
    return { success: true, folderId };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("File not found")) {
      return { error: "Klasör bulunamadı veya erişim izni yok. Lütfen doğru klasör linkini girdiğinizden ve e-posta adresine düzenleyici yetkisi verdiğinizden emin olun." };
    }
    return { error: "Klasöre erişim sağlanırken bir hata oluştu." };
  }
}

export async function getMasterFolderStructure() {
  const masterFolderId = process.env.GOOGLE_MASTER_FOLDER_ID;
  if (!masterFolderId) {
    return { error: "Sistem yapılandırma hatası: Google Master Folder ID eksik." };
  }

  try {
    const drive = await getDriveClient();
    const items = [];
    const queue = [masterFolderId];

    while (queue.length > 0) {
      const currentParentId = queue.shift()!;
      let pageToken: string | undefined = undefined;

      do {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const listRes: any = await drive.files.list({
          q: `'${currentParentId}' in parents and trashed=false`,
          fields: "nextPageToken, files(id, name, mimeType)",
          pageToken: pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = listRes.data.files || [];
        for (const file of files) {
          if (file.id && file.name) {
            const isFolder = file.mimeType === "application/vnd.google-apps.folder";
            items.push({
              sourceId: file.id,
              name: file.name,
              mimeType: file.mimeType || "",
              masterParentId: currentParentId,
              isFolder,
            });
            if (isFolder) {
              queue.push(file.id);
            }
          }
        }
        pageToken = listRes.data.nextPageToken || undefined;
      } while (pageToken);
    }

    return { success: true, items, masterFolderId };
  } catch (error: unknown) {
    console.error("Master folder fetch error:", error);
    return { error: "Master klasör yapısı alınamadı." };
  }
}

export async function syncDriveItem(
  item: { sourceId: string; name: string; mimeType: string; isFolder: boolean },
  destParentId: string
) {
  try {
    const drive = await getDriveClient();
    const escapedName = item.name.replace(/'/g, "\\'");

    // Check if it already exists
    const existingRes = await drive.files.list({
      q: `'${destParentId}' in parents and name='${escapedName}' and mimeType='${item.mimeType}' and trashed=false`,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const existingFile =
      existingRes.data.files && existingRes.data.files.length > 0 ? existingRes.data.files[0] : null;

    if (item.isFolder) {
      if (existingFile?.id) {
        return { success: true, destId: existingFile.id };
      }

      const newFolder = await drive.files.create({
        requestBody: {
          name: item.name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [destParentId],
        },
        fields: "id",
        supportsAllDrives: true,
      });
      return { success: true, destId: newFolder.data.id };
    } else {
      if (existingFile?.id) {
        return { success: true, destId: existingFile.id };
      }

      const newFile = await drive.files.copy({
        fileId: item.sourceId,
        requestBody: {
          name: item.name,
          parents: [destParentId],
        },
        fields: "id",
        supportsAllDrives: true,
      });
      return { success: true, destId: newFile.data.id };
    }
  } catch (error: unknown) {
    console.error("Sync item error:", error);
    return { error: `Senkronizasyon hatası: ${item.name}` };
  }
}

export async function completeDriveOnboarding(folderId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı oturumu bulunamadı." };
  }

  const workspaceId = user.user_metadata?.workspace_id;
  if (!workspaceId) {
    return { error: "Çalışma alanı bulunamadı." };
  }

  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({ drive_folder_id: folderId, is_onboarded: true })
    .eq("id", workspaceId);

  if (workspaceError) {
    console.error("Workspace update failed:", workspaceError);
    return { error: "Çalışma alanı güncellenemedi." };
  }

  const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { user_metadata: { ...user.user_metadata, is_onboarded: true } }
  );

  if (updateAuthError) {
    console.error("User metadata update failed:", updateAuthError);
    return { error: "Kullanıcı bilgileri güncellenemedi." };
  }

  return { success: true };
}

// Retain old for backwards compatibility temporarily
export async function verifyDriveFolder(formData: FormData) {
  const folderLink = formData.get("folderLink") as string;

  if (!folderLink) {
    return { error: "Lütfen bir klasör linki girin." };
  }

  const folderId = extractFolderId(folderLink);

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı oturumu bulunamadı." };
  }

  const workspaceId = user.user_metadata?.workspace_id;

  if (!workspaceId) {
    return { error: "Çalışma alanı bulunamadı." };
  }

  // Google Drive API Verification
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.error("Missing Google Drive credentials.");
    return { error: "Sistem yapılandırma hatası: Google Drive kimlik bilgileri eksik." };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      // Needs full drive access to copy files
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Check if we have access to the user's provided folder
    await drive.files.get({
      fileId: folderId,
      fields: "id, name",
      supportsAllDrives: true,
    });

    // Copy contents of master folder to the user's folder
    const masterFolderId = process.env.GOOGLE_MASTER_FOLDER_ID;
    if (!masterFolderId) {
      console.error("Google Master Folder ID is missing.");
      return { error: "Sistem yapılandırma hatası: Google Master Folder ID eksik." };
    }

    // Helper function to recursively copy folder contents
    async function copyFolderContents(sourceId: string, destId: string) {
      const res = await drive.files.list({
        q: `'${sourceId}' in parents and trashed=false`,
        fields: "files(id, name, mimeType)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = res.data.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        const escapedName = file.name?.replace(/'/g, "\\'") || "";

        // Check if item already exists in destination
        const existingRes = await drive.files.list({
          q: `'${destId}' in parents and name='${escapedName}' and mimeType='${file.mimeType}' and trashed=false`,
          fields: "files(id)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const existingFile = existingRes.data.files && existingRes.data.files.length > 0 ? existingRes.data.files[0] : null;

        if (file.mimeType === "application/vnd.google-apps.folder") {
          let newFolderId = existingFile?.id;

          if (!newFolderId) {
            // Create new folder in destination
            const folderMetadata = {
              name: file.name,
              mimeType: "application/vnd.google-apps.folder",
              parents: [destId],
            };
            const newFolder = await drive.files.create({
              requestBody: folderMetadata,
              fields: "id",
              supportsAllDrives: true,
            });
            newFolderId = newFolder.data.id;
          }

          if (newFolderId && file.id) {
            await copyFolderContents(file.id, newFolderId);
          }
        } else {
          // Copy file to destination if it doesn't exist
          if (!existingFile && file.id) {
            await drive.files.copy({
              fileId: file.id,
              requestBody: {
                name: file.name, // Ensure the copied file has the original name
                parents: [destId],
              },
              supportsAllDrives: true,
            });
          }
        }
      }
    }

    // Perform the copy operation
    await copyFolderContents(masterFolderId, folderId);

  } catch (error: unknown) {
    console.error("Google Drive API Error:", error);

    if (error instanceof Error && error.message?.includes("File not found")) {
      return { error: "Klasör bulunamadı veya erişim izni yok. Lütfen doğru klasör linkini girdiğinizden ve e-posta adresine düzenleyici yetkisi verdiğinizden emin olun." };
    }

    return { error: "Dosyalar kopyalanırken veya erişim sağlanırken bir hata oluştu." };
  }

  // 1. Update Workspace
  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({ 
      drive_folder_id: folderId,
      is_onboarded: true 
    })
    .eq("id", workspaceId);

  if (workspaceError) {
    console.error("Workspace update failed:", workspaceError);
    return { error: "Çalışma alanı güncellenemedi." };
  }

  // 2. Update User Metadata
  const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        is_onboarded: true
      }
    }
  );

  if (updateAuthError) {
    console.error("User metadata update failed:", updateAuthError);
    return { error: "Kullanıcı bilgileri güncellenemedi." };
  }

  redirect("/dashboard");
}
