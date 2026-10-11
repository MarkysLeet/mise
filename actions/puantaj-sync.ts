/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthClient } from "./drive";
import { google } from "googleapis";

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

  const res = await drive.files.list({
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

  // 1. Determine current number of employee rows in the sheet
  const sheetData = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `${monthName}!B6:B`,
  });

  const bValues = sheetData.data.values || [];
  let currentRows = 0;
  for (let i = 0; i < bValues.length; i++) {
    // If the cell is completely empty or just whitespace, we've hit the end of the list
    if (!bValues[i][0] || bValues[i][0].toString().trim() === "") {
      break;
    }
    currentRows++;
  }

  // If there are somehow 0 rows found in B6:B (unexpected for template, but handle it safely)
  if (currentRows === 0) {
    currentRows = 1;
  }

  const batchRequests: any[] = [];

  // 2. Adjust rows to exactly N
  if (currentRows < N) {
    // Need to add rows
    const rowsToAdd = N - currentRows;
    batchRequests.push({
      insertDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 5 + currentRows,
          endIndex: 5 + currentRows + rowsToAdd
        },
        inheritFromBefore: true
      }
    });

    // Copy styles and formulas from the *last valid employee row* to newly inserted rows
    // Source: row index (5 + currentRows - 1), destination: new rows
    batchRequests.push({
      copyPaste: {
        source: {
          sheetId,
          startRowIndex: 5 + currentRows - 1,
          endRowIndex: 5 + currentRows,
          startColumnIndex: 0,
          endColumnIndex: 54 // Column BB
        },
        destination: {
          sheetId,
          startRowIndex: 5 + currentRows,
          endRowIndex: 5 + currentRows + rowsToAdd,
          startColumnIndex: 0,
          endColumnIndex: 54 // Column BB
        },
        pasteType: "PASTE_NORMAL"
      }
    });
  } else if (currentRows > N && N > 0) {
    // Need to remove excess rows
    const rowsToRemove = currentRows - N;
    batchRequests.push({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 5 + N,
          endIndex: 5 + N + rowsToRemove
        }
      }
    });
  } else if (currentRows > 1 && N === 0) {
      // If N=0, we keep 1 row and delete the rest
      const rowsToRemove = currentRows - 1;
      batchRequests.push({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 6,
          endIndex: 6 + rowsToRemove
        }
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
