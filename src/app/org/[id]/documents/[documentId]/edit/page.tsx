import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SquarePen } from "lucide-react";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail, findDocumentById, updateDocument } from "@/lib/sheet";
import { canAccessTop, splitCategory } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { UnsavedChangesProvider } from "@/components/UnsavedChangesGuard";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, linkMuted } from "@/lib/styles";

export default async function EditDocumentPage({
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

  const categoryPath = splitCategory(doc.category);
  if (!canAccessTop(categoryPath[0] ?? "", affiliation.roles, false)) {
    notFound();
  }

  async function saveDocument(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation) return;

    const target = await findDocumentById(id, documentId);
    if (!target || target.isFolder) return;

    const targetCategoryPath = splitCategory(target.category);
    if (!canAccessTop(targetCategoryPath[0] ?? "", affiliation.roles, false)) return;

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    if (!title || !content) return;

    await updateDocument({ groupId: id, id: documentId, title, content });
    redirect(`/org/${id}/documents/${documentId}`);
  }

  return (
    <UnsavedChangesProvider>
      <DocumentsLayout groupId={id} activePath={categoryPath}>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <SquarePen className="h-5 w-5" aria-hidden />
          文書を編集
          <span className="text-sm font-normal text-muted">({doc.category})</span>
        </h1>

        <form action={saveDocument} className="flex min-h-0 flex-1 flex-col gap-3">
          <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
            タイトル
            <input
              name="title"
              type="text"
              defaultValue={doc.title}
              required
              className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
          </label>

          <MarkdownEditor name="content" defaultValue={doc.content} />

          <div className="flex shrink-0 items-center gap-3">
            <SubmitButton className={btnPrimary}>保存</SubmitButton>
            <Link href={`/org/${id}/documents/${documentId}`} className={linkMuted}>
              キャンセル
            </Link>
          </div>
        </form>
      </DocumentsLayout>
    </UnsavedChangesProvider>
  );
}
