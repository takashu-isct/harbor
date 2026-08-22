import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, SquarePen } from "lucide-react";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findDocumentsByGroup,
  hasAdminRole,
} from "@/lib/sheet";
import { canAccessCategory, canAccessTop, splitCategory, timeAgo } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";
import { btnPrimary, linkMutedXs, tileHover } from "@/lib/styles";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation) {
    notFound();
  }

  const isAdmin = await hasAdminRole(id, affiliation.roles);
  const allDocuments = await findDocumentsByGroup(id);
  const visible = allDocuments
    .filter((m) => !m.isFolder && canAccessCategory(m.category, affiliation.roles, isAdmin))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <DocumentsLayout groupId={id} activePath={[]}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileText className="h-5 w-5" aria-hidden />
          最近の文書
        </h1>
        {affiliation.roles.length > 0 && (
          <Link href={`/org/${id}/documents/new`} className={btnPrimary}>
            新規作成
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">
          左のフォルダから、文書を作成してみましょう。
        </p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {visible.map((m) => {
            const canWrite = canAccessTop(
              splitCategory(m.category)[0] ?? "",
              affiliation.roles,
              false
            );
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 bg-surface px-4 py-3 text-sm ${tileHover}`}
              >
                <Link href={`/org/${id}/documents/${m.id}`} className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted">{m.category}</span>
                  <span className="flex flex-wrap items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-foreground">{m.title}</span>
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
                        {m.authorName.slice(0, 1)}
                      </span>
                      {m.authorName} ・ {timeAgo(m.createdAt)}
                    </span>
                  </span>
                </Link>
                {canWrite && (
                  <Link
                    href={`/org/${id}/documents/${m.id}/edit`}
                    className={`shrink-0 ${linkMutedXs}`}
                  >
                    <SquarePen className="h-3.5 w-3.5" aria-hidden />
                    編集
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DocumentsLayout>
  );
}
