import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Export an array of JSON objects to an Excel file.
 * Drop-in replacement for the old xlsx library (OWASP A06 fix).
 */
export async function exportToExcel(
  data: Record<string, any>[],
  sheetName: string,
  fileName: string
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) return;

  // Set columns from the keys of the first row
  const columns = Object.keys(data[0]).map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 5, 15),
  }));
  worksheet.columns = columns;

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1a1a1a' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFd4af37' } };

  // Add data rows
  data.forEach((row) => worksheet.addRow(row));

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, fileName);
}
