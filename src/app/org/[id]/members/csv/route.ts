import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail, findGroupMembers, hasAdminRole } from "@/lib/sheet";

// CSVをExcel等で開いたときに先頭が=+-@だと数式として実行されてしまうのを防ぐ
// (Googleスプレッドシート向けのsanitizeCellと同じ考え方)。
function escapeCsvField(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation || !(await hasAdminRole(id, affiliation.roles))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const members = await findGroupMembers(id);
  const rows: string[][] = [
    ["氏名", "メールアドレス", "ロール"],
    ...members.map((m) => [m.name, m.email, m.roles.join("、")]),
  ];
  const csv = "﻿" + rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="members-${id}.csv"`,
    },
  });
}
