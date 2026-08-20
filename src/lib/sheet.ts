import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
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

export type Group = {
  id: string;
  name: string;
  status: string;
  foundedAt: string;
};

export async function findGroupById(id: string): Promise<Group | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体!A2:D",
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => r[0] === id);
  if (!row) return null;
  return { id: row[0], name: row[1] ?? "", status: row[2] ?? "", foundedAt: row[3] ?? "" };
}

export type GroupMember = {
  email: string;
  name: string;
  role: string;
  permission: string;
  expiresAt: string;
};

export async function findGroupMembers(groupId: string): Promise<GroupMember[]> {
  const sheets = getSheetsClient();
  const [affRes, peopleRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "団体所属!A2:E" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "人!A2:D" }),
  ]);
  const nameByEmail = new Map(
    (peopleRes.data.values ?? []).map((r) => [r[0]?.trim().toLowerCase(), r[1] ?? ""])
  );
  return (affRes.data.values ?? [])
    .filter((r) => r[1] === groupId)
    .map((r) => ({
      email: r[0],
      name: nameByEmail.get(r[0]?.trim().toLowerCase()) ?? "",
      role: r[2] ?? "",
      permission: r[3] ?? "",
      expiresAt: r[4] ?? "",
    }));
}

export async function addGroupMember(params: {
  groupId: string;
  email: string;
  name: string;
  role: string;
  permission: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const existing = await findPersonByEmail(params.email);
  if (!existing) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "人!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[params.email, params.name, "", new Date().toISOString().slice(0, 10)]],
      },
    });
  }
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "団体所属!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[params.email, params.groupId, params.role, params.permission, ""]],
    },
  });
}

export type LedgerEntry = {
  groupId: string;
  date: string;
  description: string;
  amount: number;
  type: "収入" | "支出";
  recordedBy: string;
  recordedAt: string;
};

export async function findLedgerEntries(groupId: string): Promise<LedgerEntry[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "会計!A2:G",
  });
  return (res.data.values ?? [])
    .filter((r) => r[0] === groupId)
    .map((r) => ({
      groupId: r[0],
      date: r[1] ?? "",
      description: r[2] ?? "",
      amount: Number(r[3] ?? 0),
      type: (r[4] === "支出" ? "支出" : "収入") as "収入" | "支出",
      recordedBy: r[5] ?? "",
      recordedAt: r[6] ?? "",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function addLedgerEntry(params: {
  groupId: string;
  date: string;
  description: string;
  amount: number;
  type: "収入" | "支出";
  recordedBy: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "会計!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          params.groupId,
          params.date,
          params.description,
          params.amount,
          params.type,
          params.recordedBy,
          new Date().toISOString(),
        ],
      ],
    },
  });
}
