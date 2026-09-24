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
  // Try to match standard Google Drive folder URLs
  // e.g., https://drive.google.com/drive/folders/1EZOaP-383rRVAEmqE1Hy...
  // e.g., https://drive.google.com/drive/u/0/folders/1EZOaP-383rRVAEmqE1Hy...
  const match = input.match(/folders\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If no URL pattern matched, assume it's just the raw ID
  return input.trim();
}

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
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });
    await drive.files.get({ fileId: folderId, fields: "id, name" });
  } catch (error) {
    console.error("Google Drive API Error:", error);
    return { error: "Klasör bulunamadı veya erişim izni yok. Lütfen e-posta adresine düzenleyici yetkisi verdiğinizden emin olun." };
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
