import { readConfig } from "../lib/server/config";
import { GoogleSheetsRepository } from "../lib/server/googleSheets";

const config = readConfig();
const sheets = new GoogleSheetsRepository(config.google);
await sheets.ensureHeaders();
const rows = await sheets.listRegistrations();
process.stdout.write(`Google Sheets OK: ${rows.length} registration row(s) in ${config.google.sheetName}.\n`);
