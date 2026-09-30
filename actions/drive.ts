"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";


// Service client needed to update user_metadata
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


async function getDriveClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, workspaces(*)")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.workspaces) {
    throw new Error("Çalışma alanı bulunamadı.");
  }

  const workspace = profile.workspaces;

  if (!workspace.google_refresh_token) {
    throw new Error("Google Drive bağlantısı bulunamadı. Lütfen hesabınızı bağlayın.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: workspace.google_refresh_token,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function checkDriveFolderAccess() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Kullanıcı oturumu bulunamadı." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, workspaces(*)")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.workspaces || !profile.workspaces.drive_folder_id) {
       return { error: "Çalışma alanına ait klasör bulunamadı." };
    }

    const folderId = profile.workspaces.drive_folder_id;
    const drive = await getDriveClient();
    await drive.files.get({
      fileId: folderId,
      fields: "id, name",
      supportsAllDrives: true,
    });
    return { success: true, folderId };
  } catch (error: unknown) {
    console.error("Drive API Access Error:", error);
    if (error instanceof Error && error.message?.includes("File not found")) {
      return { error: "Klasör bulunamadı veya erişim izni yok." };
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

export async function getGoogleAuthClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Kullanıcı oturumu bulunamadı.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    throw new Error("Çalışma alanı bulunamadı.");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("google_refresh_token")
    .eq("id", profile.workspace_id)
    .single();

  if (!workspace?.google_refresh_token) {
    throw new Error("Google Drive bağlantısı bulunamadı. Lütfen hesabınızı bağlayın.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: workspace.google_refresh_token,
  });

  return oauth2Client;
}
