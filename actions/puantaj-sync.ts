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
async function getOrCreateUserPuantajSpreadsheet(drive: any, workspace: any, year: number) {
  const puantajFolderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Puantaj']);

  const fileName = `PUANTAJ ${year}`;
  let res = await drive.files.list({
    q: `'${puantajFolderId}' in parents and name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
  });

  if (!res.data.files || res.data.files.length === 0) {
    // Fallback search in Puantaj folder
    res = await drive.files.list({
      q: `'${puantajFolderId}' in parents and name contains 'PUANTAJ' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
    });
  }

  // If found in user folder, return it
  if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
    return { id: res.data.files[0].id, name: res.data.files[0].name };
  }

  // Fallback (Self-healing): Copy from MASTER_FOLDER_ID
  const masterFolderId = process.env.GOOGLE_MASTER_FOLDER_ID;
  if (!masterFolderId) {
    throw new Error("Master Folder yapılandırılmamış, PUANTAJ kopyalanamadı.");
  }

  const masterSearchRes = await drive.files.list({
    q: `name contains 'PUANTAJ 2026' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name, parents)',
  });

  let masterTemplate = masterSearchRes.data.files?.[0];

  // Double-check if we actually found something from master (checking parents)
  if (masterSearchRes.data.files && masterSearchRes.data.files.length > 0) {
    for (const file of masterSearchRes.data.files) {
      if (!file.id) continue;
      let currentFile = file;
      let isBelongingToMaster = false;
      for (let i = 0; i < 5; i++) {
        if (!currentFile.parents || currentFile.parents.length === 0) break;
        if (currentFile.parents.includes(masterFolderId)) {
          isBelongingToMaster = true;
          break;
        }
        try {
          const parentRes = await drive.files.get({
            fileId: currentFile.parents[0],
            fields: "id, parents",
            supportsAllDrives: true,
          });
          currentFile = parentRes.data;
        } catch { break; }
      }
      if (isBelongingToMaster) {
        masterTemplate = file;
        break;
      }
    }
  }

  if (!masterTemplate || !masterTemplate.id) {
    throw new Error(`Master PUANTAJ şablonu bulunamadı.`);
  }

  // Copy template to user's Anex/Puantaj folder
  const copyRes = await drive.files.copy({
    fileId: masterTemplate.id,
    requestBody: {
      name: `PUANTAJ ${year}`,
      parents: [puantajFolderId],
    },
    supportsAllDrives: true,
  });

  if (!copyRes.data.id) {
    throw new Error("PUANTAJ kopyalanırken bir hata oluştu.");
  }

  return { id: copyRes.data.id, name: copyRes.data.name };
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

  const spreadsheet = await getOrCreateUserPuantajSpreadsheet(drive, workspace, year);
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

  // Read C6:G110
  const response = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetTitle}'!C6:G110`,
  });

  const rows = response.data.values || [];
  let seq_no = 1;
  const employeesToInsert = [];

  // Get existing employees to prevent duplicates
  const { data: existingEmployees } = await supabase
    .from("employees")
    .select("sicil_no, full_name")
    .eq("workspace_id", workspace.id);

  const existingSet = new Set(existingEmployees?.map(e => `${e.sicil_no}-${e.full_name}`));

  for (const row of rows) {
    const sicil_no = row[0]?.trim();
    const full_name = row[1]?.trim();
    const role_title = row[2]?.trim();
    const hire_date_raw = row[3]?.trim(); // expected DD.MM.YYYY

    if (!full_name) continue; // Skip empty rows

    const key = `${sicil_no}-${full_name}`;
    if (existingSet.has(key)) continue;

    let hire_date = null;
    if (hire_date_raw) {
      const parts = hire_date_raw.split('.');
      if (parts.length === 3) {
         hire_date = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
      }
    }

    employeesToInsert.push({
      workspace_id: workspace.id,
      seq_no: seq_no++,
      sicil_no: sicil_no || null,
      full_name,
      role_title: role_title || null,
      hire_date: hire_date,
      is_active: true
    });
    existingSet.add(key);
  }

  if (employeesToInsert.length > 0) {
    await supabase.from("employees").insert(employeesToInsert);
  }

  revalidatePath("/puantaj");
  return { success: true, count: employeesToInsert.length };
 } catch (err: any) {
   console.error("importEmployeesFromSheet error:", err);
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

  const spreadsheet = await getOrCreateUserPuantajSpreadsheet(drive, workspace, year);
  const spreadsheetId = spreadsheet.id!;

  const sheetsApi = google.sheets({ version: 'v4', auth });
  const sheetMetadata = await sheetsApi.spreadsheets.get({ spreadsheetId });

  const monthName = MONTH_NAMES[month - 1];
  let sheetToSync = sheetMetadata.data.sheets?.find(s => s.properties?.title === monthName);

  if (!sheetToSync) {
    const sablonSheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Şablon');
    if (!sablonSheet) throw new Error("Şablon sekmesi bulunamadı");

    // Duplicate Şablon
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: sablonSheet.properties!.sheetId,
              insertSheetIndex: sheetMetadata.data.sheets!.length,
              newSheetName: monthName
            }
          }
        ]
      }
    });

    // Need to fetch fresh metadata to get the new sheetId
    const freshMeta = await sheetsApi.spreadsheets.get({ spreadsheetId });
    sheetToSync = freshMeta.data.sheets?.find(s => s.properties?.title === monthName);
  }

  const sheetId = sheetToSync!.properties!.sheetId!;

  // Format dates for Google Sheet (DD.MM.YYYY)
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [y, m, d] = dateString.split('-');
    return `${d}.${m}.${y}`;
  };

  const requests: any[] = [];

  // Dynamically add rows if employees > 105
  // Include employees active in this month or who were terminated in or after this month
  const activeEmployees = employees.filter(e => {
    if (e.is_active) return true;
    if (!e.termination_date) return true;
    const termDate = new Date(e.termination_date);
    const syncMonthStart = new Date(year, month - 1, 1);
    return termDate >= syncMonthStart;
  });
  const rowsNeeded = activeEmployees.length;

  if (rowsNeeded > 105) {
    const rowsToAdd = rowsNeeded - 105;
    requests.push({
      insertDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 109,
          endIndex: 109 + rowsToAdd
        },
        inheritFromBefore: true
      }
    });
  }

  if (requests.length > 0) {
    await sheetsApi.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  const maxRows = Math.max(105, rowsNeeded);

  // Batch updates for values
  const dataToUpdate = [
    {
      range: `'${monthName}'!B2`,
      values: [[`Tesis Adı: ${workspace.hotel_group || 'Anex Hotels'}`]]
    },
    {
      range: `'${monthName}'!B3`,
      values: [[`Departman: ${workspace.name}`]]
    },
    {
      range: `'${monthName}'!H4`,
      values: [[`${monthName.toUpperCase()} AYI`]]
    },
    {
      range: `'${monthName}'!T${112 + Math.max(0, rowsNeeded - 105)}`,
      values: [[`${profile?.first_name} ${profile?.last_name}`]]
    }
  ];

  // Employee Data
  const employeeDataRows = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let i = 0; i < maxRows; i++) {
    const emp = activeEmployees[i];
    if (emp) {
      const row = [
        i + 1, // No
        emp.sicil_no || "",
        emp.full_name,
        emp.role_title || "",
        formatDate(emp.hire_date),
        formatDate(emp.termination_date),
        "" // Spacer for Column G (Çıkış Tarihi) to H (1st Day) is not needed, we will specify range B:AL
      ];

      // Add days
      for (let day = 1; day <= 31; day++) {
        if (day <= daysInMonth) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);
          row.push(entry && entry.status !== 'TERMINATED' ? entry.status : "");
        } else {
          row.push(""); // Invalid days for this month
        }
      }
      employeeDataRows.push(row);
    } else {
      // Empty row to clear old data
      const emptyRow = ["", "", "", "", "", ""];
      for(let day=1; day<=31; day++) emptyRow.push("");
      employeeDataRows.push(emptyRow);
    }
  }

  dataToUpdate.push({
    range: `'${monthName}'!B6:AL${5 + maxRows}`,
    values: employeeDataRows
  });

  await sheetsApi.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: dataToUpdate
    }
  });

  // Second Batch update for Colors
  const formatRequests: any[] = [];

  // First clear background colors for all cells in the grid H6:AL{5+maxRows}
  formatRequests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 5,
        endRowIndex: 5 + maxRows,
        startColumnIndex: 7, // H
        endColumnIndex: 38 // AL + 1
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 1, blue: 1, alpha: 1 } // White default
        }
      },
      fields: "userEnteredFormat.backgroundColor"
    }
  });

  // Apply colors
  for (let i = 0; i < maxRows; i++) {
    const emp = activeEmployees[i];
    if (emp) {
      for (let day = 1; day <= 31; day++) {
        const colIndex = 7 + (day - 1);

        let bgColor = null;
        if (day > daysInMonth) {
          bgColor = { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 }; // Gray for non-existent days
        } else {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);

          if (entry?.status === 'D') {
             bgColor = { red: 1, green: 0, blue: 0, alpha: 1 }; // Red
          } else if (entry?.status === 'TERMINATED') {
             bgColor = { red: 0, green: 0, blue: 0, alpha: 1 }; // Black
          }
        }

        if (bgColor) {
          formatRequests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 5 + i,
                endRowIndex: 5 + i + 1,
                startColumnIndex: colIndex,
                endColumnIndex: colIndex + 1
              },
              cell: {
                userEnteredFormat: { backgroundColor: bgColor }
              },
              fields: "userEnteredFormat.backgroundColor"
            }
          });
        }
      }
    } else {
       // Fill invalid days gray for empty rows as well
       for (let day = daysInMonth + 1; day <= 31; day++) {
          const colIndex = 7 + (day - 1);
          formatRequests.push({
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 5 + i,
                endRowIndex: 5 + i + 1,
                startColumnIndex: colIndex,
                endColumnIndex: colIndex + 1
              },
              cell: {
                userEnteredFormat: { backgroundColor: { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 } }
              },
              fields: "userEnteredFormat.backgroundColor"
            }
          });
       }
    }
  }

  if (formatRequests.length > 0) {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: formatRequests }
    });
  }

  return { success: true, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
 } catch (err: any) {
   console.error("syncPuantajToDrive error:", err);
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}
