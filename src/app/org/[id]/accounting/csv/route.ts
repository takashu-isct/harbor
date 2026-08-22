import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail, findLedgerEntries } from "@/lib/sheet";

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
  if (!affiliations.some((a) => a.groupId === id)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 記帳日ではなく取引日(date)の古い順=時系列順に並べる。
  const entries = [...(await findLedgerEntries(id))].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  let balance = 0;
  const rows: string[][] = [
    ["日付", "内容", "収入", "支出", "残高", "登録者", "登録日時"],
    ...entries.map((e) => {
      balance += e.type === "収入" ? e.amount : -e.amount;
      return [
        e.date,
        e.description,
        e.type === "収入" ? String(e.amount) : "",
        e.type === "支出" ? String(e.amount) : "",
        String(balance),
        e.recordedBy,
        e.recordedAt,
      ];
    }),
  ];
  const csv = "﻿" + rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="accounting-${id}.csv"`,
    },
  });
}
