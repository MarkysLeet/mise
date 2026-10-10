const fs = require('fs');
let code = fs.readFileSync('actions/puantaj-sync.ts', 'utf8');

// The logic needs to be carefully updated. Let's extract the part that needs to change and rewrite it.

const regex = /\/\/ 1\. Dynamically add rows if N > 1.*?const createStringCell = \(val: string\) => \(\{\s*userEnteredValue: \{ stringValue: val \}\s*\}\);/s;

let newLogic = `  // 1. Determine current number of employee rows in the sheet
  const sheetData = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: \`\${monthName}!B6:B\`,
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

  const createStringCell = (val: string) => ({ userEnteredValue: { stringValue: val } });`;

code = code.replace(regex, newLogic);
fs.writeFileSync('actions/puantaj-sync.ts', code);
