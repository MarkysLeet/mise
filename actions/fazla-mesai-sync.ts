/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthClient } from "./drive";
import { google } from "googleapis";
import { ensureFolderPath } from "@/lib/google-drive";

const MONTH_NAMES_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function colToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

const createStringCell = (val: string) => ({ userEnteredValue: { stringValue: val } });

async function getOrCreateUserFazlaMesaiSpreadsheet(drive: any, workspace: any, month: number, year: number) {
  const folderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Fazla mesai']);
  const monthNameUpper = MONTH_NAMES_TR[month - 1].toLocaleUpperCase('tr-TR');
  const dept = workspace.name || "F&B";
  const fileName = `${dept} ${monthNameUpper} ${year} FAZLA MESAİ TAKİP TABLOSU`;
  const escapedFileName = fileName.replace(/'/g, "\\'");

  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escapedFileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
    return { id: res.data.files[0].id, name: res.data.files[0].name, isNew: false };
  }

  // Find Fazla_Mesai_Taslak in Drive or master folder
  let taslakRes = await drive.files.list({
    q: `name = 'Fazla_Mesai_Taslak' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name)',
  });

  let taslakFile = taslakRes.data.files && taslakRes.data.files.length > 0 ? taslakRes.data.files[0] : null;

  if (!taslakFile && process.env.GOOGLE_MASTER_FOLDER_ID) {
    const masterRes = await drive.files.list({
      q: `'${process.env.GOOGLE_MASTER_FOLDER_ID}' in parents and name = 'Fazla_Mesai_Taslak' and trashed = false`,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
    });
    if (masterRes.data.files && masterRes.data.files.length > 0) {
      taslakFile = masterRes.data.files[0];
    }
  }

  if (!taslakFile) {
    throw new Error("Fazla_Mesai_Taslak şablon dosyası Google Drive'da bulunamadı.");
  }

  const copiedFile = await drive.files.copy({
    fileId: taslakFile.id,
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    supportsAllDrives: true,
  });

  return { id: copiedFile.data.id, name: fileName, isNew: true };
}

export async function getFazlaMesaiSpreadsheetId(month: number, year: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", profile?.workspace_id)
      .single();

    if (!workspace || !workspace.drive_folder_id) {
      throw new Error("Workspace not connected to Google Drive");
    }

    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const folderId = await ensureFolderPath(drive, workspace.drive_folder_id, ['Anex', 'Fazla mesai']);
    const monthNameUpper = MONTH_NAMES_TR[month - 1].toLocaleUpperCase('tr-TR');
    const dept = workspace.name || "F&B";
    const fileName = `${dept} ${monthNameUpper} ${year} FAZLA MESAİ TAKİP TABLOSU`;
    const escapedFileName = fileName.replace(/'/g, "\\'");

    const res = await drive.files.list({
      q: `'${folderId}' in parents and name = '${escapedFileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      fields: 'files(id, name)',
    });

    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
      return {
        success: true,
        spreadsheetId: res.data.files[0].id,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${res.data.files[0].id}`
      };
    }

    return { success: false, error: "Tablo henüz oluşturulmadı." };
  } catch (err: any) {
    console.error("getFazlaMesaiSpreadsheetId error:", err);
    return { success: false, error: err.message || "Bir hata oluştu" };
  }
}

export async function syncFazlaMesaiToDrive(year: number, month: number) {
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

    if (!workspace || !workspace.drive_folder_id) {
      throw new Error("Workspace not connected to Google Drive");
    }

    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const sheetsApi = google.sheets({ version: 'v4', auth });

    // 1. Get or create spreadsheet
    const spreadsheet = await getOrCreateUserFazlaMesaiSpreadsheet(drive, workspace, month, year);
    const spreadsheetId = spreadsheet.id!;

    // 2. Fetch all monthly fazla_mesai records
    const monthStr = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const { data: records, error: recordsError } = await supabase
      .from("fazla_mesai")
      .select(`
        id,
        employee_id,
        mesai_date,
        hours,
        description,
        employees:employee_id (
          id,
          full_name,
          role_title,
          department_outlet,
          seq_no
        )
      `)
      .eq("workspace_id", workspace.id)
      .gte("mesai_date", startDate)
      .lte("mesai_date", endDate)
      .order("mesai_date", { ascending: true });

    if (recordsError) throw new Error(recordsError.message);

    // 3. Inspect sheets metadata
    const freshMeta = await sheetsApi.spreadsheets.get({ spreadsheetId });
    const sheets = freshMeta.data.sheets || [];

    let toplamSheet = sheets.find(s => s.properties?.title === "TOPLAM");
    if (!toplamSheet) {
      toplamSheet = sheets[0];
    }
    const toplamSheetId = toplamSheet?.properties?.sheetId ?? 0;

    // Phase 1: Structure updates (Renaming daily sheets and removing excess sheets/columns)
    const structureRequests: any[] = [];

    // Map daily sheets
    const dailySheetsInfo: { sheetId: number; title: string; day: number }[] = [];
    for (const s of sheets) {
      const title = s.properties?.title || "";
      if (title === "TOPLAM") continue;

      const match = title.match(/^(\d{2})\.\d{2}$/);
      if (match) {
        const day = parseInt(match[1], 10);
        dailySheetsInfo.push({
          sheetId: s.properties!.sheetId!,
          title,
          day
        });
      }
    }

    // Rename needed sheets and delete excess sheets
    for (const dSheet of dailySheetsInfo) {
      const targetTitle = `${String(dSheet.day).padStart(2, '0')}.${monthStr}`;
      if (dSheet.day <= daysInMonth) {
        if (dSheet.title !== targetTitle) {
          structureRequests.push({
            updateSheetProperties: {
              properties: {
                sheetId: dSheet.sheetId,
                title: targetTitle
              },
              fields: "title"
            }
          });
        }
      } else {
        // Extra day (e.g. 31st in a 30-day month) -> delete sheet
        structureRequests.push({
          deleteSheet: {
            sheetId: dSheet.sheetId
          }
        });
      }
    }

    // If month has fewer than 31 days, remove extra columns in TOPLAM
    if (daysInMonth < 31) {
      const currentColumnCount = toplamSheet?.properties?.gridProperties?.columnCount || 40;
      const colsToRemove = 31 - daysInMonth;
      const startColIndex = 3 + daysInMonth;
      if (currentColumnCount >= 34 && colsToRemove > 0) {
        structureRequests.push({
          deleteDimension: {
            range: {
              sheetId: toplamSheetId,
              dimension: "COLUMNS",
              startIndex: startColIndex,
              endIndex: startColIndex + colsToRemove
            }
          }
        });
      }
    }

    if (structureRequests.length > 0) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: structureRequests }
      });
    }

    // Phase 2: Populate Data
    const dataRequests: any[] = [];
    const dept = workspace.name || "F&B";

    // 2.1 Update each daily sheet
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const targetDateStr = `${year}-${monthStr}-${dayStr}`;
      const dayRecords = (records || []).filter((r: any) => r.mesai_date === targetDateStr);

      const dSheet = dailySheetsInfo.find(s => s.day === day);
      if (!dSheet) continue;

      const maxDayRows = Math.max(40, dayRecords.length);
      const dayRowsData: any[] = [];

      for (let k = 0; k < maxDayRows; k++) {
        if (k < dayRecords.length) {
          const r = dayRecords[k];
          dayRowsData.push({
            values: [
              createStringCell(r.employees?.full_name || ""),
              createStringCell(""), // TCKN (empty for now)
              createStringCell(dept),
              createStringCell(r.employees?.role_title || ""),
              createStringCell(r.description || ""),
              { userEnteredValue: { numberValue: Number(r.hours) || 0 } },
              createStringCell("OK")
            ]
          });
        } else {
          dayRowsData.push({
            values: [
              createStringCell(""),
              createStringCell(""),
              createStringCell(""),
              createStringCell(""),
              createStringCell(""),
              createStringCell(""),
              createStringCell("")
            ]
          });
        }
      }

      dataRequests.push({
        updateCells: {
          range: {
            sheetId: dSheet.sheetId,
            startRowIndex: 2, // Row 3
            endRowIndex: 2 + maxDayRows,
            startColumnIndex: 0,
            endColumnIndex: 7
          },
          rows: dayRowsData,
          fields: "userEnteredValue"
        }
      });
    }

    // 2.2 Update TOPLAM Sheet
    const empMap = new Map<string, any>();
    for (const r of (records || [])) {
      if (r.employees && !empMap.has(r.employee_id)) {
        empMap.set(r.employee_id, r.employees);
      }
    }
    const uniqueEmployees = Array.from(empMap.values()).sort((a, b) => {
      return (a.full_name || "").localeCompare(b.full_name || "", "tr");
    });
    const N = uniqueEmployees.length;

    // Check current employee rows in TOPLAM
    const toplamData = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: "TOPLAM!B3:B",
    });
    const bValues = toplamData.data.values || [];
    let currentRows = 0;
    for (let i = 0; i < bValues.length; i++) {
      if (!bValues[i][0] || bValues[i][0].toString().trim() === "") break;
      currentRows++;
    }
    if (currentRows === 0) currentRows = 1;

    const targetRows = Math.max(1, N);

    // Adjust employee rows in TOPLAM
    if (currentRows < targetRows) {
      const rowsToAdd = targetRows - currentRows;
      dataRequests.push({
        insertDimension: {
          range: {
            sheetId: toplamSheetId,
            dimension: "ROWS",
            startIndex: 2 + currentRows,
            endIndex: 2 + currentRows + rowsToAdd
          },
          inheritFromBefore: true
        }
      });

      dataRequests.push({
        copyPaste: {
          source: {
            sheetId: toplamSheetId,
            startRowIndex: 2 + currentRows - 1,
            endRowIndex: 2 + currentRows,
            startColumnIndex: 0,
            endColumnIndex: 3 + daysInMonth + 2
          },
          destination: {
            sheetId: toplamSheetId,
            startRowIndex: 2 + currentRows,
            endRowIndex: 2 + currentRows + rowsToAdd,
            startColumnIndex: 0,
            endColumnIndex: 3 + daysInMonth + 2
          },
          pasteType: "PASTE_NORMAL"
        }
      });
    } else if (currentRows > targetRows && targetRows > 0) {
      const rowsToRemove = currentRows - targetRows;
      dataRequests.push({
        deleteDimension: {
          range: {
            sheetId: toplamSheetId,
            dimension: "ROWS",
            startIndex: 2 + targetRows,
            endIndex: 2 + targetRows + rowsToRemove
          }
        }
      });
    }

    // Populate employee data & formulas in TOPLAM
    const toplamRowsData: any[] = [];
    if (N > 0) {
      for (let i = 0; i < N; i++) {
        const emp = uniqueEmployees[i];
        const rowNumber = 3 + i; // 1-based row in Sheets

        const rowCells: any[] = [
          { userEnteredValue: { numberValue: i + 1 } },
          createStringCell(emp.full_name || ""),
          createStringCell(emp.role_title || "")
        ];

        // Day formulas
        for (let d = 1; d <= daysInMonth; d++) {
          const colLetter = colToLetter(2 + d);
          const formula = `=SUMIF(INDIRECT("'" & TEXT(${colLetter}$2,"00") & ".${monthStr}'!A3:A41"), $B${rowNumber}, INDIRECT("'" & TEXT(${colLetter}$2,"00") & ".${monthStr}'!F3:F41"))`;
          rowCells.push({ userEnteredValue: { formulaValue: formula } });
        }

        // Total sum formula
        const lastDayColLetter = colToLetter(2 + daysInMonth);
        const totalFormula = `=SUM(D${rowNumber}:${lastDayColLetter}${rowNumber})`;
        rowCells.push({ userEnteredValue: { formulaValue: totalFormula } });

        toplamRowsData.push({ values: rowCells });
      }
    } else {
      // Empty row placeholder
      const emptyCells: any[] = [
        { userEnteredValue: { numberValue: 1 } },
        createStringCell(""),
        createStringCell("")
      ];
      for (let d = 1; d <= daysInMonth; d++) {
        emptyCells.push({ userEnteredValue: { numberValue: 0 } });
      }
      emptyCells.push({ userEnteredValue: { numberValue: 0 } });
      toplamRowsData.push({ values: emptyCells });
    }

    dataRequests.push({
      updateCells: {
        range: {
          sheetId: toplamSheetId,
          startRowIndex: 2,
          endRowIndex: 2 + targetRows,
          startColumnIndex: 0,
          endColumnIndex: 3 + daysInMonth + 1
        },
        rows: toplamRowsData,
        fields: "userEnteredValue"
      }
    });

    if (dataRequests.length > 0) {
      await sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: dataRequests }
      });
    }

    return {
      success: true,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    };
  } catch (err: any) {
    console.error("syncFazlaMesaiToDrive error:", err);
    return { success: false, error: err.message || "Bir hata oluştu" };
  }
}
