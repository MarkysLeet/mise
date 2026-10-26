import re

with open("actions/puantaj.ts", "r") as f:
    content = f.read()

undo_terminate_code = """
export async function undoTerminateEmployee(id: string) {
 try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) throw new Error("No workspace found");

  const { error: updateError } = await supabase
    .from("employees")
    .update({ termination_date: null, is_active: true })
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/puantaj");
  return { success: true };
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 } catch (err: any) {
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}
"""

# Insert before terminateEmployee
if "export async function terminateEmployee" in content:
    content = content.replace("export async function terminateEmployee", undo_terminate_code + "\nexport async function terminateEmployee")
    with open("actions/puantaj.ts", "w") as f:
        f.write(content)
    print("Successfully patched actions/puantaj.ts")
else:
    print("Could not find terminateEmployee in actions/puantaj.ts")
