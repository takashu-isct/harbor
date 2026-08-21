import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

const HARBOR_ADMIN_GROUP_ID = "crew";
const HARBOR_ADMIN_ROLE_NAME = "CREW開発部";

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function getSheetIdByTitle(title: string): Promise<number> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = res.data.sheets?.find((s) => s.properties?.title === title);
  if (sheet?.properties?.sheetId == null) {
    throw new Error(`sheet not found: ${title}`);
  }
  return sheet.properties.sheetId;
}

async function deleteSheetRow(title: string, rowNumber: number): Promise<void> {
  const sheets = getSheetsClient();
  const sheetId = await getSheetIdByTitle(title);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
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

export async function findAllGroups(): Promise<Group[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体!A2:D",
  });
  return (res.data.values ?? []).map((r) => ({
    id: r[0],
    name: r[1] ?? "",
    status: r[2] ?? "",
    foundedAt: r[3] ?? "",
  }));
}

export async function addGroup(params: {
  id: string;
  name: string;
  status: string;
  foundedAt: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "団体!A:D",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[params.id, params.name, params.status, params.foundedAt]],
    },
  });
}

export async function isHarborAdmin(email: string): Promise<boolean> {
  const affiliations = await findActiveAffiliationsByEmail(email);
  return affiliations.some(
    (a) => a.groupId === HARBOR_ADMIN_GROUP_ID && a.permission === HARBOR_ADMIN_ROLE_NAME
  );
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

  const alreadyMember = (await findActiveAffiliationsByEmail(params.email)).some(
    (a) => a.groupId === params.groupId
  );
  if (alreadyMember) return;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "団体所属!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[params.email, params.groupId, params.role, params.permission, ""]],
    },
  });
}

export async function removeGroupMember(groupId: string, email: string): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体所属!A2:E",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex(
    (r) => r[0]?.trim().toLowerCase() === email.toLowerCase() && r[1] === groupId
  );
  if (idx === -1) return;
  await deleteSheetRow("団体所属", idx + 2);
}

export async function updateGroupMemberPermission(params: {
  groupId: string;
  email: string;
  permission: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体所属!A2:E",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex(
    (r) => r[0]?.trim().toLowerCase() === params.email.toLowerCase() && r[1] === params.groupId
  );
  if (idx === -1) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `団体所属!D${idx + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[params.permission]] },
  });
}

export type Role = {
  groupId: string;
  name: string;
  isAdmin: boolean;
};

export async function findRoles(groupId: string): Promise<Role[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "ロール!A2:C",
  });
  return (res.data.values ?? [])
    .filter((r) => r[0] === groupId)
    .map((r) => ({
      groupId: r[0],
      name: r[1] ?? "",
      isAdmin: String(r[2]).toUpperCase() === "TRUE",
    }));
}

export async function ensureDefaultRoles(groupId: string): Promise<Role[]> {
  const roles = await findRoles(groupId);
  if (roles.length > 0) return roles;
  await addRole({ groupId, name: "管理者", isAdmin: true });
  await addRole({ groupId, name: "メンバー", isAdmin: false });
  return findRoles(groupId);
}

export async function addRole(params: {
  groupId: string;
  name: string;
  isAdmin: boolean;
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "ロール!A:C",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[params.groupId, params.name, params.isAdmin ? "TRUE" : "FALSE"]],
    },
  });
}

export async function isAdminRole(groupId: string, roleName: string): Promise<boolean> {
  const roles = await findRoles(groupId);
  return roles.some((r) => r.name === roleName && r.isAdmin);
}

export type Application = {
  groupId: string;
  email: string;
  name: string;
  desiredRole: string;
  status: "未処理" | "承認" | "却下";
  submittedAt: string;
  newGroupName: string;
};

export async function findApplicationsByGroup(groupId: string): Promise<Application[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "申請!A2:G",
  });
  return (res.data.values ?? [])
    .filter((r) => r[0] === groupId)
    .map((r) => ({
      groupId: r[0],
      email: r[1] ?? "",
      name: r[2] ?? "",
      desiredRole: r[3] ?? "",
      status: (r[4] === "承認" || r[4] === "却下" ? r[4] : "未処理") as Application["status"],
      submittedAt: r[5] ?? "",
      newGroupName: r[6] ?? "",
    }));
}

export async function findFoundingApplications(): Promise<Application[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "申請!A2:G",
  });
  return (res.data.values ?? [])
    .filter((r) => !r[0])
    .map((r) => ({
      groupId: r[0] ?? "",
      email: r[1] ?? "",
      name: r[2] ?? "",
      desiredRole: r[3] ?? "",
      status: (r[4] === "承認" || r[4] === "却下" ? r[4] : "未処理") as Application["status"],
      submittedAt: r[5] ?? "",
      newGroupName: r[6] ?? "",
    }));
}

export async function findApplicationsByEmail(email: string): Promise<Application[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "申請!A2:G",
  });
  return (res.data.values ?? [])
    .filter((r) => r[1]?.trim().toLowerCase() === email.toLowerCase())
    .map((r) => ({
      groupId: r[0],
      email: r[1] ?? "",
      name: r[2] ?? "",
      desiredRole: r[3] ?? "",
      status: (r[4] === "承認" || r[4] === "却下" ? r[4] : "未処理") as Application["status"],
      submittedAt: r[5] ?? "",
      newGroupName: r[6] ?? "",
    }));
}

export async function addApplication(params: {
  groupId: string;
  email: string;
  name: string;
  desiredRole: string;
  newGroupName?: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "申請!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          params.groupId,
          params.email,
          params.name,
          params.desiredRole,
          "未処理",
          new Date().toISOString(),
          params.newGroupName ?? "",
        ],
      ],
    },
  });
}

export async function decideApplication(params: {
  groupId: string;
  email: string;
  submittedAt: string;
  status: "承認" | "却下";
}): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "申請!A2:G",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex(
    (r) =>
      r[0] === params.groupId &&
      r[1]?.trim().toLowerCase() === params.email.toLowerCase() &&
      r[5] === params.submittedAt
  );
  if (idx === -1) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `申請!E${idx + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[params.status]] },
  });
}

export type LinkItem = {
  ownerId: string;
  label: string;
  url: string;
  iconUrl: string;
  visibility: string;
};

export async function findLinksByOwner(ownerId: string): Promise<LinkItem[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "リンク!A2:E",
  });
  return (res.data.values ?? [])
    .filter((r) => r[0] === ownerId)
    .map((r) => ({
      ownerId: r[0],
      label: r[1] ?? "",
      url: r[2] ?? "",
      iconUrl: r[3] ?? "",
      visibility: r[4] ?? "",
    }));
}

export async function addLink(params: {
  ownerId: string;
  label: string;
  url: string;
  iconUrl: string;
  visibility: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "リンク!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[params.ownerId, params.label, params.url, params.iconUrl, params.visibility]],
    },
  });
}

export async function removeLink(ownerId: string, url: string): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "リンク!A2:E",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === ownerId && r[2] === url);
  if (idx === -1) return;
  await deleteSheetRow("リンク", idx + 2);
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
