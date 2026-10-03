<<<<<<< SEARCH
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

  revalidatePath("/settings");
  revalidatePath("/puantaj");
  return data;
}
=======
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
>>>>>>> REPLACE
