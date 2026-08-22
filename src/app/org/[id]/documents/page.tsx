import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findDocumentsByGroup,
  hasAdminRole,
} from "@/lib/sheet";
import { canAccessCategory, canAccessTop, splitCategory, timeAgo } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";

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
          <span aria-hidden>📝</span>
          最近の文書
        </h1>
        {affiliation.roles.length > 0 && (
          <Link
            href={`/org/${id}/documents/new`}
            className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
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
                className="flex items-center gap-3 bg-surface px-4 py-3 text-sm transition hover:brightness-110"
              >
                <Link href={`/org/${id}/documents/${m.id}`} className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted">{m.category}</span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span aria-hidden>📄</span>
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
                    className="shrink-0 text-xs text-muted underline hover:text-foreground"
                  >
                    ✏️ 編集
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
