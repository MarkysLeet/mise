"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// We need the service role key to insert into tables bypassing RLS, or to update user_metadata securely if needed,
// but for standard signup, the standard client works. 
// However, to create profile/workspace immediately without RLS issues, we'll use a service client.
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function registerUser(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const hotelGroup = formData.get("hotelGroup") as string;
  const department = formData.get("department") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!firstName || !lastName || !hotelGroup || !department || !email || !password) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  const supabase = await createClient();

  // 1. Create Workspace
  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .insert([
      { name: department, hotel_group: hotelGroup, is_onboarded: false }
    ])
    .select()
    .single();

  if (workspaceError || !workspace) {
    console.error("Workspace creation failed:", workspaceError);
    return { error: "Çalışma alanı oluşturulamadı." };
  }

  // 2. Register User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        workspace_id: workspace.id,
        is_onboarded: false,
      },
    },
  });

  if (authError || !authData.user) {
    console.error("User registration failed:", authError);
    // Cleanup workspace if auth fails
    await supabaseAdmin.from("workspaces").delete().eq("id", workspace.id);
    return { error: authError?.message || "Kullanıcı kaydı oluşturulamadı." };
  }

  // 3. Create Profile
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        id: authData.user.id,
        workspace_id: workspace.id,
        first_name: firstName,
        last_name: lastName,
        role: "admin",
      }
    ]);

  if (profileError) {
    console.error("Profile creation failed:", profileError);
    // Might want to clean up, but user is already created in Auth. 
    return { error: "Profil oluşturulamadı. Lütfen destek ile iletişime geçin." };
  }

  return { success: true };
}
