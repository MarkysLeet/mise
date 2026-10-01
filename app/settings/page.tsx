import { getWorkspace, getProfile } from "@/actions/settings";
import SettingsClientPage from "./SettingsClientPage";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const workspace = await getWorkspace();
  const profile = await getProfile();

  if (!workspace || !profile) {
    redirect("/login");
  }

  return <SettingsClientPage initialWorkspace={workspace} initialProfile={profile} />;
}
