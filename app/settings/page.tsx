import { getWorkspace } from "@/actions/settings";
import SettingsClientPage from "./SettingsClientPage";

export default async function SettingsPage() {
  const workspace = await getWorkspace();

  return <SettingsClientPage initialWorkspace={workspace} />;
}
