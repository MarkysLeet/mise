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

export async function getPuantajSpreadsheetId(year: number) {
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
  }).sort((a, b) => {
    const roleA = a.role_title || "";
    const roleB = b.role_title || "";
    return roleA.localeCompare(roleB, 'tr-TR');
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
      values: [[`Tesis Adı: ${workspace.hotel_name || workspace.hotel_group || 'Anex Hotels'}`]]
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
        formatDate(emp.termination_date)
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
      const emptyRow = [i + 1, "", "", "", "", ""];
      for(let day=1; day<=31; day++) emptyRow.push("");
      employeeDataRows.push(emptyRow);
    }
  }

  dataToUpdate.push({
    range: `'${monthName}'!B6:AL${5 + maxRows}`,
    values: employeeDataRows.map(row => row.slice(0, 37))
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

  // First clear background colors for all cells in the grid H6:AL{110} (or maxRows if higher)
  // We want to clear all the way down to at least row 110 to erase left-over colors from deleted employees
  formatRequests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 5,
        endRowIndex: Math.max(110, 5 + maxRows),
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
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (day > daysInMonth) {
          bgColor = { red: 0.9, green: 0.9, blue: 0.9, alpha: 1 }; // Gray for non-existent days
        } else if (emp.termination_date && new Date(dateStr) > new Date(emp.termination_date)) {
          bgColor = { red: 0, green: 0, blue: 0, alpha: 1 }; // Black for days after termination
        } else {
          const entry = entries.find(e => e.employee_id === emp.id && e.date === dateStr);

          if (entry?.status === 'D') {
             bgColor = { red: 1, green: 0, blue: 0, alpha: 1 }; // Red
          } else if (entry?.status === 'TERMINATED') {
             bgColor = { red: 0, green: 0, blue: 0, alpha: 1 }; // Black (fallback)
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

  // Delete trailing rows dynamically (Cleanup empty dimension rows below the last employee)
  // Our template has rows going down potentially arbitrarily if we added some.
  // The sheet metadata's gridProperties.rowCount tells us how many rows total.
  try {
    const updatedMeta = await sheetsApi.spreadsheets.get({ spreadsheetId });
    const sheetInfo = updatedMeta.data.sheets?.find(s => s.properties?.sheetId === sheetId);
    const totalRows = sheetInfo?.properties?.gridProperties?.rowCount || 0;

    // Always ensure at least 15 extra rows for signatures/spacing at the bottom
    // We only delete if there are an excessive amount of empty rows at the bottom
    // Wait, the requirement says "Удалить все лишние строки начиная от (последний индекс сотрудника + смещение шапки) и до конца листа"
    // It means the table should look perfectly clean without hanging zeros.
    // However, we should preserve the signature rows at the bottom.
    // The signatures are at T{112 + Math.max(0, rowsNeeded - 105)}.
    // In the template, signature row is at index 111 (row 112).
    // The empty rows that have hanging 0s are between maxRows and the signature row, or maybe we just clear them.
    // Let's delete exactly the empty employee rows instead of resizing the whole sheet, or just clear them.
    // Actually, deleteDimension deletes rows. If signatures are below, they will move up.
    // The prompt says "Нужно удалить все лишние строки начиная от (последний индекс сотрудника + смещение шапки) и до конца листа, чтобы таблица выглядела идеально чисто, без висящих внизу нулей."
    // Let's calculate the exact range to delete.
    // Wait, "удалить ... до конца листа" implies deleting rows.

    // In our template, data starts at row 6 (index 5).
    // maxRows was used to iterate over 105 rows minimum.
    // Let's delete from index `5 + rowsNeeded` to index `5 + maxRows` or `totalRows` if we want to delete everything.
    // Wait, the prompt says "deleteDimension... начиная от (последний индекс сотрудника + смещение шапки) и до конца листа".

    if (totalRows > 0 && 5 + rowsNeeded < 110) {
        // We delete from the first empty employee row up to row 110 (index 110)
        // This will bring up the signature rows.
        await sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: 5 + rowsNeeded,
                  endIndex: 110
                }
              }
            }]
          }
        });
    }
  } catch (err) {
      console.log("Failed to trim empty rows", err);
  }

  return { success: true, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` };
 } catch (err: any) {
   console.error("syncPuantajToDrive error:", err);
   return { success: false, error: err.message || "Bir hata oluştu" };
 }
}
