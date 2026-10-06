"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;

  if (!workspaceId) {
    return null;
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  return workspace;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function updateProfile(firstName: string, lastName: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı girişi yapılmamış." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", user.id);

  if (error) {
    return { error: "Profil güncellenemedi." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateWorkspace(hotelName: string, hotelGroup: string, department: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı girişi yapılmamış." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    return { error: "Çalışma alanı bulunamadı." };
  }

  const { error } = await supabase
    .from("workspaces")
    .update({ hotel_name: hotelName, hotel_group: hotelGroup, name: department })
    .eq("id", workspaceId);

  if (error) {
    return { error: "Çalışma alanı güncellenemedi." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Kullanıcı girişi yapılmamış." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Attempt to delete user from Auth, which will cascade delete profile
  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    return { error: "Kullanıcı silinemedi." };
  }

  // Delete workspace if they were the owner/member
  if (workspaceId) {
    await supabaseAdmin.from("workspaces").delete().eq("id", workspaceId);
  }

  redirect("/login");
}

export async function getRoles() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    return [];
  }

  const { data: roles } = await supabase
    .from("roles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("priority", { ascending: true })
    .order("title", { ascending: true });

  return roles || [];
}

export async function addRole(title: string, priority: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    throw new Error("Workspace not found");
  }

  const { data, error } = await supabase
    .from("roles")
    .insert([{ workspace_id: workspaceId, title, priority }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/puantaj");
  return data;
}

export async function updateRole(id: string, title: string, priority: number) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    throw new Error("Workspace not found");
  }

  // Fetch old role to know its previous title for cascading updates to employees
  const { data: oldRole, error: fetchError } = await supabase
    .from("roles")
    .select("title")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const oldTitle = oldRole?.title;

  const { data, error } = await supabase
    .from("roles")
    .update({ title, priority })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Cascade the update to employees if title changed
  if (oldTitle && oldTitle !== title) {
    const { error: updateEmployeesError } = await supabase
      .from("employees")
      .update({ role_title: title })
      .eq("workspace_id", workspaceId)
      .eq("role_title", oldTitle);

    if (updateEmployeesError) {
      console.error("Failed to update employee roles:", updateEmployeesError.message);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/puantaj");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return data;
}

export async function deleteRole(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    throw new Error("Workspace not found");
  }

  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/puantaj");
  return { success: true };
}

export async function getTutanakTemplates() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    return [];
  }

  const { data: templates } = await supabase
    .from("tutanak_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("category", { ascending: true })
    .order("title", { ascending: true });

  return JSON.parse(JSON.stringify(templates || []));
}

export async function addTutanakTemplate(category: string, title: string, content: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    throw new Error("Workspace not found");
  }

  const { data, error } = await supabase
    .from("tutanak_templates")
    .insert([{ workspace_id: workspaceId, category, title, content }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/tutanak");
  return JSON.parse(JSON.stringify(data));
}

export async function updateTutanakTemplate(id: string, category: string, title: string, content: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    throw new Error("Workspace not found");
  }

  const { data, error } = await supabase
    .from("tutanak_templates")
    .update({ category, title, content })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/tutanak");
  return data;
}

export async function deleteTutanakTemplate(id: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.workspace_id;
  if (!workspaceId) {
    throw new Error("Workspace not found");
  }

  const { error } = await supabase
    .from("tutanak_templates")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/tutanak");
  return { success: true };
}
