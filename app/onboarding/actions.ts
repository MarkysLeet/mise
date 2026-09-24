"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service client needed to update user_metadata
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyDriveFolder(formData: FormData) {
  const folderLink = formData.get("folderLink") as string;

  if (!folderLink) {
    return { error: "Lütfen bir klasör linki girin." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı oturumu bulunamadı." };
  }

  const workspaceId = user.user_metadata?.workspace_id;

  if (!workspaceId) {
    return { error: "Çalışma alanı bulunamadı." };
  }

  // TODO: Actual Google Drive API verification will go here

  // 1. Update Workspace
  const { error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .update({ 
      drive_folder_id: folderLink, // Temporarily storing link/id directly
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

  return { success: true };
}
