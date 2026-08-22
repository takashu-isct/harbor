import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findDocumentById,
  hasAdminRole,
} from "@/lib/sheet";
import { canAccessCategory, splitCategory, timeAgo } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";
import { proseClass } from "@/lib/markdownProse";

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

  return (
    <DocumentsLayout groupId={id} activePath={categoryPath}>
      <div>
        <Link
          href={`/org/${id}/documents/category/${categoryPath.map(encodeURIComponent).join("/")}`}
          className="text-sm text-muted underline"
        >
          ← {doc.category}
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>📄</span>
          {doc.title}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
            {doc.authorName.slice(0, 1)}
          </span>
          {doc.authorName} ・ {timeAgo(doc.createdAt)}
        </p>
      </div>

      <div className={`max-w-2xl bg-surface px-4 py-4 text-sm text-foreground ${proseClass}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
      </div>
    </DocumentsLayout>
  );
}
