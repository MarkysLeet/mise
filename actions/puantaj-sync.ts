/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthClient } from "./drive";
import { google } from "googleapis";
import { revalidatePath } from "next/cache";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

import { ensureFolderPath } from "@/lib/google-drive";

// Helper to find or create the Puantaj spreadsheet
async function getOrCreateUserPuantajSpreadsheet(drive: any, workspace: any, month: number, year: number) {
  const puantajFolderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Puantaj']);
  const monthName = MONTH_NAMES[month - 1];
  const fileName = `PUANTAJ ${monthName} ${year}`;

  let res = await drive.files.list({
    q: `'${puantajFolderId}' in parents and name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
  });

  // If found exactly
  if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
    return { id: res.data.files[0].id, name: res.data.files[0].name, isNew: false };
  }

  // Find Puantaj_Taslak anywhere in the user's connected folder or subfolders
  const taslakRes = await drive.files.list({
    q: `name = 'Puantaj_Taslak' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
  });

  if (!taslakRes.data.files || taslakRes.data.files.length === 0) {
    throw new Error("Puantaj_Taslak dosyası Drive'da bulunamadı.");
  }

  const taslakFile = taslakRes.data.files[0];

  const copiedFile = await drive.files.copy({
    fileId: taslakFile.id,
    requestBody: {
      name: fileName,
      parents: [puantajFolderId]
    },
    supportsAllDrives: true,
  });

  return { id: copiedFile.data.id, name: fileName, isNew: true };
}

export async function importEmployeesFromSheet(year: number, month: number) {
 try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", (await supabase.from("profiles").select("workspace_id").eq("id", user.id).single()).data?.workspace_id)
    .single();

  if (!workspace || !workspace.drive_folder_id) {
    throw new Error("Workspace not connected to Google Drive");
  }

  const auth = await getGoogleAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const spreadsheet = await getOrCreateUserPuantajSpreadsheet(drive, workspace, month, year);
  const spreadsheetId = spreadsheet.id!;

  const sheetsApi = google.sheets({ version: 'v4', auth });
  const sheetMetadata = await sheetsApi.spreadsheets.get({ spreadsheetId });

  const monthName = MONTH_NAMES[month - 1];
  let sheetToRead = sheetMetadata.data.sheets?.find(s => s.properties?.title === monthName);

  if (!sheetToRead) {
    sheetToRead = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Şablon');
  }

  if (!sheetToRead) {
    throw new Error("Şablon sekmesi bulunamadı");
  }

  const sheetTitle = sheetToRead.properties!.title;

  // Read B6:AL110
  const response = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!B6:AL110`,
  });

  const rows = response.data.values || [];
  let seq_no = 1;

  // Get existing employees to update or insert
  const { data: existingEmployees } = await supabase
    .from("employees")
    .select("*")
    .eq("workspace_id", workspace.id);

  const existingMap = new Map(existingEmployees?.map(e => [`${e.sicil_no || ''}-${e.full_name}`, e]));

  const employeesToUpsert = [];
  const employeesToInsert = [];
  const validRows = [];

  const VALID_STATUSES = new Set(["X", "Hİ", "Üİ", "D", "R", "Yİ", "SZ", "ÜR"]);

  for (const row of rows) {
    // Indexes: 0 = No (B), 1 = Sicil (C), 2 = Ad Soyad (D), 3 = Görevi (E), 4 = Giriş (F), 5 = Çıkış (G)
    const sicil_no = row[1]?.trim() || "";
    const full_name = row[2]?.trim();
    const role_title = row[3]?.trim();
    const hire_date_raw = row[4]?.trim(); // expected DD.MM.YYYY
    const termination_date_raw = row[5]?.trim(); // expected DD.MM.YYYY

    if (!full_name) continue; // Skip empty rows

    const key = `${sicil_no}-${full_name}`;
    const existingEmp = existingMap.get(key);

    let hire_date = null;
    if (hire_date_raw) {
      const parts = hire_date_raw.split('.');
      if (parts.length === 3) {
         hire_date = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      }
    }

    let termination_date = null;
    let is_active = true;
    if (termination_date_raw) {
      const parts = termination_date_raw.split('.');
      if (parts.length === 3) {
         termination_date = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
         is_active = false;
      }
    }

    const employeeObj = {
      workspace_id: workspace.id,
      seq_no: seq_no++,
      sicil_no: sicil_no || null,
      full_name,
      role_title: role_title || null,
      hire_date: hire_date,
      termination_date: termination_date,
      is_active: is_active
    };

    if (existingEmp) {
      // Update existing
      // Preserve hire_date if missing in sheet but present in db
      if (!employeeObj.hire_date && existingEmp.hire_date) {
        employeeObj.hire_date = existingEmp.hire_date;
      }
      employeesToUpsert.push({ ...employeeObj, id: existingEmp.id });
    } else {
      // Insert new
      employeesToInsert.push(employeeObj);
    }

    validRows.push({ key, row });
  }

  // Update existing employees in bulk
  if (employeesToUpsert.length > 0) {
    await supabase.from("employees").upsert(employeesToUpsert);
  }

  // Insert new employees in bulk
  if (employeesToInsert.length > 0) {
    const { data: newEmployees } = await supabase.from("employees").insert(employeesToInsert).select();
    if (newEmployees) {
      for (const emp of newEmployees) {
        const key = `${emp.sicil_no || ''}-${emp.full_name}`;
        existingMap.set(key, emp);
      }
    }
  }

  const entriesToInsert = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (const { key, row } of validRows) {
    const emp = existingMap.get(key);
    if (!emp) continue;

    // Process entries (days 1-31 are indexes 6-36)
    for (let i = 0; i < 31; i++) {
      const day = i + 1;
      if (day > daysInMonth) continue;

      const colIndex = 6 + i;
      const status = row[colIndex]?.trim()?.toUpperCase();

      if (status && VALID_STATUSES.has(status)) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        entriesToInsert.push({
          workspace_id: workspace.id,
          employee_id: emp.id,
          date: dateStr,
          status: status
        });
      }
    }
  }

  // Clear existing entries for this month
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  await supabase
    .from("puantaj_entries")
    .delete()
    .eq("workspace_id", workspace.id)
    .gte("date", startDateStr)
    .lte("date", endDateStr);

  // Insert new entries in chunks
  if (entriesToInsert.length > 0) {
    const chunkSize = 1000;
    for (let i = 0; i < entriesToInsert.length; i += chunkSize) {
      await supabase.from("puantaj_entries").insert(entriesToInsert.slice(i, i + chunkSize));
    }
  }

  // Fetch updated employees and entries for immediate UI update
  const { getEmployees, getPuantajEntries } = await import('./puantaj');

  // We need to fetch without the auth check from the other file if we are already authenticated here,
  // but since getEmployees uses createClient which uses the same auth context, it should work fine.
  const updatedEmployees = await getEmployees(year, month);
  const updatedEntries = await getPuantajEntries(year, month);

  revalidatePath("/puantaj");
  return { success: true, count: seq_no - 1, employees: updatedEmployees, entries: updatedEntries };
 } catch (err: any) {
   console.error("importEmployeesFromSheet error:", err);
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}

export async function getPuantajSpreadsheetId(month: number, year: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", (await supabase.from("profiles").select("workspace_id").eq("id", user.id).single()).data?.workspace_id)
      .single();

    if (!workspace || !workspace.drive_folder_id) {
      throw new Error("Workspace not connected to Google Drive");
    }

    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const spreadsheet = await getOrCreateUserPuantajSpreadsheet(drive, workspace, month, year);
    return { success: true, spreadsheetId: spreadsheet.id };
  } catch (err: any) {
    console.error("getPuantajSpreadsheetId error:", err);
    return { success: false, error: err.message || "Bir hata oluştu" };
  }
}

export async function syncPuantajToDrive(year: number, month: number, employees: any[], entries: any[]) {
 try {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", profile?.workspace_id)
    .single();

  if (!workspace || !workspace.drive_folder_id) throw new Error("Workspace not connected to Google Drive");

  const auth = await getGoogleAuthClient();
  const drive = google.drive({ version: 'v3', auth });

  const spreadsheet = await getOrCreateUserPuantajSpreadsheet(drive, workspace, month, year);
  const spreadsheetId = spreadsheet.id!;
  const monthName = MONTH_NAMES[month - 1];

  const sheetsApi = google.sheets({ version: 'v4', auth });

  if (spreadsheet.isNew) {
    // If it's a new copy from Taslak, rename "Şablon" to monthName
    const sheetMetadata = await sheetsApi.spreadsheets.get({ spreadsheetId });
    const sablonSheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Şablon');

    if (sablonSheet) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: sablonSheet.properties!.sheetId,
                  title: monthName
                },
                fields: 'title'
              }
            }
          ]
        }
      });
    }
  }

  const freshMeta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const sheetToSync = freshMeta.data.sheets?.find(s => s.properties?.title === monthName);

  if (!sheetToSync) {
     throw new Error(`${monthName} sekmesi bulunamadı.`);
  }

  const sheetId = sheetToSync!.properties!.sheetId!;

  // Format dates for Google Sheet (DD.MM.YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split('-');
    return `${d}.${m}.${y}`;
  };

  // Fetch roles for dynamic sorting
  const { data: roles } = await supabase
    .from("roles")
    .select("title, priority")
    .eq("workspace_id", workspace.id);

  // Include employees active in this month or who were terminated in or after this month
  const { sortEmployees } = await import('@/lib/sort');
  const activeEmployees = sortEmployees(employees.filter(e => {
    if (e.is_active) return true;
    if (!e.termination_date) return true;
    const termDate = new Date(e.termination_date);
    const syncMonthStart = new Date(year, month - 1, 1);
    return termDate >= syncMonthStart;
  }), roles || []);

  const N = activeEmployees.length;

  const batchRequests: any[] = [];

  // 1. Dynamically add rows if N > 1, directly after row 6 (index 6)
  if (N > 1) {
    batchRequests.push({
      insertDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 6,
          endIndex: 6 + (N - 1)
        },
        inheritFromBefore: true
      }
    });

    // 2. Copy styles and formulas from row 6 to newly inserted rows
    batchRequests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: 5,
          endRowIndex: 6,
          startColumnIndex: 0,
          endColumnIndex: 54 // Column BB
        },
        destination: {
          sheetId,
          startRowIndex: 6,
          endRowIndex: 6 + (N - 1),
          startColumnIndex: 0,
          endColumnIndex: 54 // Column BB
        },
        pasteType: "PASTE_NORMAL"
      }
    });
  }

  const createStringCell = (val: string) => ({ userEnteredValue: { stringValue: val } });

  // 3. Headers
  batchRequests.push({
    updateCells: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 2 }, // B2
      rows: [{ values: [createStringCell(`Tesis Adı: ${workspace.hotel_name || workspace.hotel_group || 'Anex Hotels'}`)] }],
      fields: "userEnteredValue"
    }
  });

  batchRequests.push({
    updateCells: {
      range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 1, endColumnIndex: 2 }, // B3
      rows: [{ values: [createStringCell(`Departman: ${workspace.name}`)] }],
      fields: "userEnteredValue"
    }
  });

  batchRequests.push({
    updateCells: {
      range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 7, endColumnIndex: 8 }, // H4
      rows: [{ values: [createStringCell(`${monthName.toUpperCase()} AYI`)] }],
      fields: "userEnteredValue"
    }
  });

  // 4. Manager Signature
  // In the new template, manager is at row 8 (index 7), columns T to AD (start 19).
  // If N > 1, the new index is 7 + (N - 1)
  const managerRowIndex = 7 + Math.max(0, N - 1);
  batchRequests.push({
    updateCells: {
      range: { sheetId, startRowIndex: managerRowIndex, endRowIndex: managerRowIndex + 1, startColumnIndex: 19, endColumnIndex: 20 }, // T
      rows: [{ values: [createStringCell(`${profile?.first_name} ${profile?.last_name}`)] }],
      fields: "userEnteredValue"
    }
  });

  // 5. Employee Data & Colors
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxRows = Math.max(1, N); // If N=0, we still update row 6 to clear it or leave it empty

  const dataRows: any[] = [];

  for (let i = 0; i < maxRows; i++) {
    const emp = activeEmployees[i];
    if (emp) {
      const rowCells: any[] = [
        { userEnteredValue: { numberValue: i + 1 } },
        createStringCell(emp.sicil_no || ""),
        createStringCell(emp.full_name || ""),
        createStringCell(emp.role_title || ""),
        createStringCell(formatDate(emp.hire_date)),
        createStringCell(formatDate(emp.termination_date))
      ];

      // Add days
      for (let day = 1; day <= 31; day++) {
        let bgColor = null;
        let cellValue = "";

        if (day <= daysInMonth) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          if (emp.termination_date && new Date(dateStr) > new Date(emp.termination_date)) {
            bgColor = { red: 0, green: 0, blue: 0, alpha: 1 }; // Black for days after termination
          } else {
            const entry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);
            if (entry && entry.status !== 'TERMINATED') {
              cellValue = entry.status;
            }
            if (entry?.status === 'D') {
              bgColor = { red: 1, green: 0, blue: 0, alpha: 1 }; // Red
            } else if (entry?.status === 'TERMINATED') {
              bgColor = { red: 0, green: 0, blue: 0, alpha: 1 }; // Black (fallback)
            }
          }
        } else {
          bgColor = { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 }; // Gray for non-existent days
        }

        const cell: any = {};
        if (cellValue) {
          cell.userEnteredValue = { stringValue: cellValue };
        }
        if (bgColor) {
          cell.userEnteredFormat = { backgroundColor: bgColor };
        }

        rowCells.push(cell);
      }
      dataRows.push({ values: rowCells });
    } else {
      // Empty row to clear old data (for N=0 case)
      const emptyCells = [
        { userEnteredValue: { numberValue: 1 } },
        createStringCell(""),
        createStringCell(""),
        createStringCell(""),
        createStringCell(""),
        createStringCell("")
      ];
      for(let day=1; day<=31; day++) {
        if (day > daysInMonth) {
          emptyCells.push({ userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 } } } as any);
        } else {
          emptyCells.push({} as any);
        }
      }
      dataRows.push({ values: emptyCells });
    }
  }

  batchRequests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 5,
        endRowIndex: 5 + maxRows,
        startColumnIndex: 1, // Column B
        endColumnIndex: 38 // Column AL (1 + 6 + 31)
      },
      rows: dataRows,
      fields: "userEnteredValue,userEnteredFormat.backgroundColor"
    }
  });

  if (batchRequests.length > 0) {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: batchRequests }
    });
  }

  return { success: true, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
 } catch (err: any) {
   console.error("syncPuantajToDrive error:", err);
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}
