import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export type Person = {
  email: string;
  name: string;
  internalId: string;
  registeredAt: string;
};

export async function findPersonByEmail(email: string): Promise<Person | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "人!A2:D",
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => r[0]?.trim().toLowerCase() === email.toLowerCase());
  if (!row) return null;
  return { email: row[0], name: row[1] ?? "", internalId: row[2] ?? "", registeredAt: row[3] ?? "" };
}

export type Affiliation = {
  email: string;
  groupId: string;
  role: string;
  permission: string;
  expiresAt: string;
};

export async function findActiveAffiliationsByEmail(email: string): Promise<Affiliation[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体所属!A2:E",
  });
  const rows = res.data.values ?? [];
  const today = new Date().toISOString().slice(0, 10);
  return rows
    .filter((r) => r[0]?.trim().toLowerCase() === email.toLowerCase())
    .filter((r) => !r[4] || r[4] >= today)
    .map((r) => ({
      email: r[0],
      groupId: r[1] ?? "",
      role: r[2] ?? "",
      permission: r[3] ?? "",
      expiresAt: r[4] ?? "",
    }));
}
