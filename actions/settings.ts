"use server";

import { createClient } from "@/lib/supabase/server";

export async function getWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const workspaceId = user.user_metadata?.workspace_id;

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
