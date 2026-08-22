import { cache } from "react";
import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

const HARBOR_ADMIN_GROUP_ID = "crew";
const HARBOR_ADMIN_ROLE_NAME = "CREW開発部";

// Google Sheets evaluates a cell written via USER_ENTERED as a formula when
// it starts with =, +, -, or @. User-supplied free text (names, labels,
// descriptions, etc.) must never reach the sheet unescaped, or a malicious
// value like `=IMPORTXML(...)` could run when CREW staff open the sheet.
function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

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
  hiddenTools: string[];
  toolOrder: string[];
};

function parseCommaList(cell: string | undefined): string[] {
  return (cell ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const findPersonByEmail = cache(async (email: string): Promise<Person | null> => {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "人!A2:F",
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => r[0]?.trim().toLowerCase() === email.toLowerCase());
  if (!row) return null;
  return {
    email: row[0],
    name: row[1] ?? "",
    internalId: row[2] ?? "",
    registeredAt: row[3] ?? "",
    hiddenTools: parseCommaList(row[4]),
    toolOrder: parseCommaList(row[5]),
  };
});

export async function updatePersonToolSettings(
  email: string,
  settings: { hidden: string[]; order: string[] }
): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "人!A2:F",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0]?.trim().toLowerCase() === email.toLowerCase());
  if (idx === -1) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `人!E${idx + 2}:F${idx + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[settings.hidden.join(","), settings.order.join(",")]] },
  });
}

export type Affiliation = {
  email: string;
  groupId: string;
  roles: string[];
  expiresAt: string;
};

export const findActiveAffiliationsByEmail = cache(async (email: string): Promise<Affiliation[]> => {
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
      roles: parseCommaList(r[3]),
      expiresAt: r[4] ?? "",
    }));
});

export type Group = {
  id: string;
  name: string;
  status: string;
  foundedAt: string;
  hiddenTools: string[];
  toolOrder: string[];
};

export const findGroupById = cache(async (id: string): Promise<Group | null> => {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体!A2:F",
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => r[0] === id);
  if (!row) return null;
  return {
    id: row[0],
    name: row[1] ?? "",
    status: row[2] ?? "",
    foundedAt: row[3] ?? "",
    hiddenTools: parseCommaList(row[4]),
    toolOrder: parseCommaList(row[5]),
  };
});

export const findAllGroups = cache(async (): Promise<Group[]> => {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体!A2:F",
  });
  return (res.data.values ?? []).map((r) => ({
    id: r[0],
    name: r[1] ?? "",
    status: r[2] ?? "",
    foundedAt: r[3] ?? "",
    hiddenTools: parseCommaList(r[4]),
    toolOrder: parseCommaList(r[5]),
  }));
});

export async function updateGroupToolSettings(
  groupId: string,
  settings: { hidden: string[]; order: string[] }
): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体!A2:F",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === groupId);
  if (idx === -1) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `団体!E${idx + 2}:F${idx + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[settings.hidden.join(","), settings.order.join(",")]] },
  });
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
      values: [[params.id, sanitizeCell(params.name), params.status, params.foundedAt]],
    },
  });
}

export const isHarborAdmin = cache(async (email: string): Promise<boolean> => {
  const affiliations = await findActiveAffiliationsByEmail(email);
  return affiliations.some(
    (a) => a.groupId === HARBOR_ADMIN_GROUP_ID && a.roles.includes(HARBOR_ADMIN_ROLE_NAME)
  );
});

export type GroupMember = {
  email: string;
  name: string;
  roles: string[];
  expiresAt: string;
};

export const findGroupMembers = cache(async (groupId: string): Promise<GroupMember[]> => {
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
      roles: parseCommaList(r[3]),
      expiresAt: r[4] ?? "",
    }));
});

export async function addGroupMember(params: {
  groupId: string;
  email: string;
  name: string;
  roles: string[];
}): Promise<void> {
  const sheets = getSheetsClient();
  const existing = await findPersonByEmail(params.email);
  if (!existing) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "人!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [params.email, sanitizeCell(params.name), "", new Date().toISOString().slice(0, 10)],
        ],
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
      values: [
        [
          params.email,
          params.groupId,
          "",
          sanitizeCell(params.roles.join(",")),
          "",
        ],
      ],
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

export async function updateGroupMemberRoles(params: {
  groupId: string;
  email: string;
  roles: string[];
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
    requestBody: { values: [[sanitizeCell(params.roles.join(","))]] },
  });
}

export type Role = {
  groupId: string;
  name: string;
  isAdmin: boolean;
};

export const findRoles = cache(async (groupId: string): Promise<Role[]> => {
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
});

export async function ensureDefaultRoles(groupId: string): Promise<Role[]> {
  const roles = await findRoles(groupId);
  if (roles.length > 0) return roles;
  const defaults: Role[] = [
    { groupId, name: "管理者", isAdmin: true },
    { groupId, name: "メンバー", isAdmin: false },
  ];
  await addRole(defaults[0]);
  await addRole(defaults[1]);
  return defaults;
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
      values: [[params.groupId, sanitizeCell(params.name), params.isAdmin ? "TRUE" : "FALSE"]],
    },
  });
}

export const hasAdminRole = cache(async (groupId: string, roleNames: string[]): Promise<boolean> => {
  const roles = await findRoles(groupId);
  const adminNames = new Set(roles.filter((r) => r.isAdmin).map((r) => r.name));
  return roleNames.some((n) => adminNames.has(n));
});

export async function updateRole(params: {
  groupId: string;
  oldName: string;
  newName: string;
  isAdmin: boolean;
}): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "ロール!A2:C",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === params.groupId && r[1] === params.oldName);
  if (idx === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `ロール!A${idx + 2}:C${idx + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[params.groupId, sanitizeCell(params.newName), params.isAdmin ? "TRUE" : "FALSE"]],
    },
  });

  if (params.newName === params.oldName) return;

  const affRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "団体所属!A2:E",
  });
  const affRows = affRes.data.values ?? [];
  for (let i = 0; i < affRows.length; i++) {
    const r = affRows[i];
    if (r[1] !== params.groupId) continue;
    const roles = parseCommaList(r[3]);
    if (!roles.includes(params.oldName)) continue;
    const newRoles = roles.map((name) => (name === params.oldName ? params.newName : name));
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `団体所属!D${i + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[sanitizeCell(newRoles.join(","))]] },
    });
  }
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

export const findApplicationsByGroup = cache(async (groupId: string): Promise<Application[]> => {
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
});

export const findFoundingApplications = cache(async (): Promise<Application[]> => {
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
});

export const findApplicationsByEmail = cache(async (email: string): Promise<Application[]> => {
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
});

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
          sanitizeCell(params.name),
          sanitizeCell(params.desiredRole),
          "未処理",
          new Date().toISOString(),
          sanitizeCell(params.newGroupName ?? ""),
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

export const findLinksByOwner = cache(async (ownerId: string): Promise<LinkItem[]> => {
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
});

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
      values: [
        [
          params.ownerId,
          sanitizeCell(params.label),
          params.url,
          params.iconUrl,
          params.visibility,
        ],
      ],
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

export type CloudLink = {
  groupId: string;
  label: string;
  url: string;
  // 空配列は「団体に所属する全員に表示」を意味する。
  roles: string[];
  // GoogleドライブのフォルダーIDへのアクセス権を自動反映するGAS向け。
  // reader(閲覧者) / writer(編集者)。
  permission: "reader" | "writer";
};

export const findCloudLinksByGroup = cache(async (groupId: string): Promise<CloudLink[]> => {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "クラウド!A2:E",
  });
  return (res.data.values ?? [])
    .filter((r) => r[0] === groupId)
    .map((r) => ({
      groupId: r[0],
      label: r[1] ?? "",
      url: r[2] ?? "",
      roles: parseCommaList(r[3]),
      permission: r[4] === "writer" ? "writer" : "reader",
    }));
});

export async function addCloudLink(params: {
  groupId: string;
  label: string;
  url: string;
  roles: string[];
  permission: "reader" | "writer";
}): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "クラウド!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          params.groupId,
          sanitizeCell(params.label),
          params.url,
          sanitizeCell(params.roles.join(",")),
          params.permission,
        ],
      ],
    },
  });
}

export async function removeCloudLink(groupId: string, url: string): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "クラウド!A2:E",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === groupId && r[2] === url);
  if (idx === -1) return;
  await deleteSheetRow("クラウド", idx + 2);
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

export const findLedgerEntries = cache(async (groupId: string): Promise<LedgerEntry[]> => {
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
});

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
          sanitizeCell(params.description),
          params.amount,
          params.type,
          params.recordedBy,
          new Date().toISOString(),
        ],
      ],
    },
  });
}

export type OrgDocument = {
  id: string;
  groupId: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  category: string;
  // 中身が空でも存在を示したい「空フォルダの目印」行の場合true。一覧には出さず、
  // フォルダツリー・件数バッジの計算にだけ使う。
  isFolder: boolean;
};

export const findDocumentsByGroup = cache(async (groupId: string): Promise<OrgDocument[]> => {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "文書!A2:H",
  });
  return (res.data.values ?? [])
    .filter((r) => r[1] === groupId)
    .map((r) => ({
      id: r[0] ?? "",
      groupId: r[1] ?? "",
      title: r[2] ?? "",
      // r[3] は種別列(空欄=通常の文書、folder=空フォルダの目印。過去は開催日を入れていた列を再利用)
      content: r[4] ?? "",
      authorName: r[5] ?? "",
      createdAt: r[6] ?? "",
      category: r[7] ?? "",
      isFolder: r[3] === "folder",
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
});

export const findDocumentById = cache(
  async (groupId: string, id: string): Promise<OrgDocument | null> => {
    const all = await findDocumentsByGroup(groupId);
    return all.find((m) => m.id === id) ?? null;
  }
);

export async function addDocument(params: {
  groupId: string;
  title: string;
  content: string;
  authorName: string;
  category: string;
}): Promise<string> {
  const sheets = getSheetsClient();
  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "文書!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          id,
          params.groupId,
          sanitizeCell(params.title),
          "",
          sanitizeCell(params.content),
          sanitizeCell(params.authorName),
          new Date().toISOString(),
          sanitizeCell(params.category),
        ],
      ],
    },
  });
  return id;
}

export async function updateDocument(params: {
  groupId: string;
  id: string;
  title: string;
  content: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "文書!A2:H",
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => r[0] === params.id && r[1] === params.groupId);
  if (idx === -1) return;
  const type = rows[idx][3] ?? "";
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `文書!C${idx + 2}:E${idx + 2}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[sanitizeCell(params.title), type, sanitizeCell(params.content)]],
    },
  });
}

// 文書0件の空フォルダを作るための目印行を追加する。
export async function addFolder(params: {
  groupId: string;
  category: string;
  authorName: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "文書!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          id,
          params.groupId,
          "",
          "folder",
          "",
          sanitizeCell(params.authorName),
          new Date().toISOString(),
          sanitizeCell(params.category),
        ],
      ],
    },
  });
}
