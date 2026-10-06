import { getWorkspace, getProfile, getRoles, getTutanakTemplates } from "@/actions/settings";
import SettingsClientPage from "./SettingsClientPage";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const workspace = await getWorkspace();
  const profile = await getProfile();
  const roles = await getRoles();
  const rawTemplates = await getTutanakTemplates();
  const templates = JSON.parse(JSON.stringify(rawTemplates));

  if (!workspace || !profile) {
    redirect("/login");
  }

  return <SettingsClientPage initialWorkspace={workspace} initialProfile={profile} initialRoles={roles} initialTemplates={templates} />;
}
