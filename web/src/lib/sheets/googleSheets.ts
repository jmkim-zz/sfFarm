const API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function createFarmingJournalSheet(token: string, facilities: string[]): Promise<string> {
  // 1. Create Spreadsheet
  const createUrl = new URL(API_BASE);
  const res = await fetch(createUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: 'SmartFarm Farming Journal',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create spreadsheet: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const defaultSheetId = data.sheets?.[0]?.properties?.sheetId || 0;

  // 2. Rename default sheet and create additional sheets
  const requests: any[] = [];
  
  // Rename the default sheet to the first facility
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: defaultSheetId,
        title: facilities[0]
      },
      fields: "title"
    }
  });

  // Create additional sheets for the remaining facilities
  for (let i = 1; i < facilities.length; i++) {
    requests.push({
      addSheet: {
        properties: {
          title: facilities[i]
        }
      }
    });
  }

  const batchUrl = new URL(`${API_BASE}/${spreadsheetId}:batchUpdate`);
  const batchRes = await fetch(batchUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests })
  });

  if (!batchRes.ok) {
    const errText = await batchRes.text();
    throw new Error(`Failed to create facility sheets: ${batchRes.status} ${errText}`);
  }

  // Fetch updated spreadsheet metadata to get sheet IDs
  const getUrl = new URL(`${API_BASE}/${spreadsheetId}`);
  const getRes = await fetch(getUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const sheetData = await getRes.json();

  // 3. Initialize Headers for ALL sheets
  for (const sheet of sheetData.sheets) {
    const title = sheet.properties.title;
    const numericId = sheet.properties.sheetId;
    await initializeSheetHeaders(token, spreadsheetId, title, numericId);
  }

  return spreadsheetId;
}

export async function initializeSheetHeaders(token: string, spreadsheetId: string, sheetTitle: string, sheetNumericId: number) {
  const row1 = [
    "기본 정보", "", "", 
    "온도", "", "", "", "", "", 
    "습도", "", "", "", "", 
    "환경", "", 
    "관수", "", "", "", "", "", "", 
    "생육", "", "", "", 
    "병해충", "", "", 
    "수확 및 작업", "", ""
  ];
  
  const row2 = [
    "날짜", "파종일", "정식 후(일)", 
    "일 최고 온도", "일 최저 온도", "일 평균 온도", "주간 평균 온도", "야간 평균 온도", "주 야간 온도차",
    "일 최고 습도", "일 최저 습도", "일 평균 습도", "주간 평균 습도", "야간 평균 습도",
    "누적 일사량", "포차", 
    "일일 총 관수 횟수", "관수량", "공급 EC", "공급 pH", "배액 EC", "배액 pH", "배액률",
    "초장", "엽면적", "경경", "화방 위치", 
    "병해충 발생 내용", "방제 약제", "투입량", 
    "일일 수확량(kg)", "상품과율", "주요 작업"
  ];

  const url = new URL(`${API_BASE}/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:AG2?valueInputOption=USER_ENTERED`);
  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetTitle}!A1:AG2`,
      majorDimension: 'ROWS',
      values: [row1, row2],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to set spreadsheet headers: ${res.status} ${errText}`);
  }

  // Format headers (bold, background color) and merge cells
  const formatUrl = new URL(`${API_BASE}/${spreadsheetId}:batchUpdate`);
  await fetch(formatUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        // Merge cells for Row 1 Categories
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 3, endColumnIndex: 9 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 9, endColumnIndex: 14 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 14, endColumnIndex: 16 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 16, endColumnIndex: 23 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 23, endColumnIndex: 27 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 27, endColumnIndex: 30 }, mergeType: "MERGE_ALL" } },
        { mergeCells: { range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 30, endColumnIndex: 33 }, mergeType: "MERGE_ALL" } },
        
        // Format Row 1 (Categories)
        {
          repeatCell: {
            range: { sheetId: sheetNumericId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 33 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.8, green: 0.85, blue: 0.8 },
                textFormat: { bold: true, fontSize: 11 },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE"
              }
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
          }
        },
        // Format Row 2 (Sub-items)
        {
          repeatCell: {
            range: { sheetId: sheetNumericId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 33 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.9, green: 0.95, blue: 0.9 },
                textFormat: { bold: true },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE"
              }
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
          }
        },
        // Freeze first 2 rows
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetNumericId,
              gridProperties: { frozenRowCount: 2 }
            },
            fields: "gridProperties.frozenRowCount"
          }
        },
        // Auto resize columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetNumericId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: 33
            }
          }
        }
      ]
    })
  });
}
