import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, SquarePen } from "lucide-react";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findDocumentById,
  hasAdminRole,
} from "@/lib/sheet";
import { canAccessCategory, canAccessTop, splitCategory, timeAgo } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";
import { proseClass } from "@/lib/markdownProse";
import { btnPrimary } from "@/lib/styles";
import { BackLink } from "@/components/BackLink";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { id, documentId } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation) {
    notFound();
  }

  const doc = await findDocumentById(id, documentId);
  if (!doc || doc.isFolder) {
    notFound();
  }

  const isAdmin = await hasAdminRole(id, affiliation.roles);
  if (!canAccessCategory(doc.category, affiliation.roles, isAdmin)) {
    notFound();
  }

  const categoryPath = splitCategory(doc.category);
  const canWrite = canAccessTop(categoryPath[0] ?? "", affiliation.roles, false);

  return (
    <DocumentsLayout groupId={id} activePath={categoryPath}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink href={`/org/${id}/documents/category/${categoryPath.map(encodeURIComponent).join("/")}`}>
            {doc.category}
          </BackLink>
          <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
            <FileText className="h-5 w-5" aria-hidden />
            {doc.title}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
              {doc.authorName.slice(0, 1)}
            </span>
            {doc.authorName} ・ {timeAgo(doc.createdAt)}
          </p>
        </div>
        {canWrite && (
          <Link href={`/org/${id}/documents/${documentId}/edit`} className={btnPrimary}>
            <SquarePen className="h-4 w-4" aria-hidden />
            編集
          </Link>
        )}
      </div>

      <div className={`max-w-2xl bg-surface px-4 py-4 text-sm text-foreground ${proseClass}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
      </div>
    </DocumentsLayout>
  );
}
