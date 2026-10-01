"use server";

import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthClient } from "./drive";
import { google } from "googleapis";
import { ensureFolderPath } from "@/lib/google-drive";

export async function syncPersonelListToDrive() {
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

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", profile.workspace_id)
      .single();

    if (!workspace || !workspace.drive_folder_id) throw new Error("Workspace not connected to Google Drive");

    // Fetch all employees
    const { data: employees } = await supabase
      .from("employees")
      .select("*")
      .eq("workspace_id", workspace.id);

    if (!employees) return { success: false, error: "No employees found" };

    // Sort employees by department_outlet, then role_title
    const sortedEmployees = [...employees].sort((a, b) => {
      const deptA = a.department_outlet || "";
      const deptB = b.department_outlet || "";
      if (deptA !== deptB) return deptA.localeCompare(deptB, 'tr-TR');

      const roleA = a.role_title || "";
      const roleB = b.role_title || "";
      return roleA.localeCompare(roleB, 'tr-TR');
    });

    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const sheetsApi = google.sheets({ version: 'v4', auth });

    // Ensure Personel_Listesi folder exists
    const personelListesiFolderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Personel_Listesi']);

    const fileName = "Personel_Listesi";

    // Check if file exists
    const res = await drive.files.list({
      q: `'${personelListesiFolderId}' in parents and name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
    });

    let spreadsheetId = "";

    if (!res.data.files || res.data.files.length === 0) {
      // Create new spreadsheet
      const newSheet = await sheetsApi.spreadsheets.create({
        requestBody: {
          properties: { title: fileName }
        }
      });

      spreadsheetId = newSheet.data.spreadsheetId!;

      // Move to correct folder
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: personelListesiFolderId,
        removeParents: 'root', // Just in case, normally it's placed in root
        supportsAllDrives: true,
      });
    } else {
      spreadsheetId = res.data.files[0].id!;
    }

    // Prepare data
    const formatDate = (dateString: string | null) => {
      if (!dateString) return "-";
      const [y, m, d] = dateString.split('-');
      return `${d}.${m}.${y}`;
    };

    const header = ["No", "Adı Soyadı", "Görev", "Bölüm", "Telefon", "Giriş Tarihi", "Çıkış Tarihi", "Durum"];

    const rows = sortedEmployees.map((emp, index) => {
      let status = "Aktif";
      if (emp.termination_date) {
        const tDate = new Date(emp.termination_date);
        const now = new Date();
        // Zero out time for comparison if needed, but since it's just a date, exact match comparison is ok
        if (tDate <= now) {
            status = "İşten Çıktı";
        }
      }

      return [
        index + 1,
        emp.full_name,
        emp.role_title || "-",
        emp.department_outlet || "-",
        emp.phone || "-",
        formatDate(emp.hire_date),
        formatDate(emp.termination_date),
        status
      ];
    });

    const values = [header, ...rows];

    // Clear and update the sheet
    const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
    const firstSheetName = meta.data.sheets?.[0]?.properties?.title || "Sheet1";

    await sheetsApi.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${firstSheetName}'!A:H`
    });

    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `'${firstSheetName}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    // Formatting Header
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: meta.data.sheets?.[0]?.properties?.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 8
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 },
                  textFormat: { bold: true }
                }
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)"
            }
          }
        ]
      }
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("syncPersonelListToDrive error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Bir hata oluştu" };
  }
}
