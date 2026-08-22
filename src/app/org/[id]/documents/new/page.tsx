import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  addDocument,
  addFolder,
  findActiveAffiliationsByEmail,
  findPersonByEmail,
} from "@/lib/sheet";
import { canAccessTop, joinCategory, splitCategory } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";
import { MarkdownEditor } from "@/components/MarkdownEditor";

export default async function NewDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; fixed?: string; kind?: string }>;
}) {
  const { id } = await params;
  const { category, fixed: fixedParam, kind: kindParam } = await searchParams;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation) {
    notFound();
  }
  if (affiliation.roles.length === 0) {
    notFound();
  }

  const kind: "document" | "folder" = kindParam === "folder" ? "folder" : "document";
  // fixedSegs がある間は、保存先(フォルダ)を選ばせる画面を出さない。
  // 呼び出し元(フォルダ閲覧画面)が「このフォルダに」という前提で渡してくる。
  const fixedSegs = fixedParam === "1" && category ? splitCategory(category) : null;
  if (fixedSegs && !canAccessTop(fixedSegs[0] ?? "", affiliation.roles, false)) {
    notFound();
  }

  const prefillSegs = !fixedSegs && category ? splitCategory(category) : [];
  const defaultRole =
    prefillSegs[0] && affiliation.roles.includes(prefillSegs[0])
      ? prefillSegs[0]
      : affiliation.roles[0];
  const defaultSubPath = joinCategory(prefillSegs.slice(1));

  async function createEntry(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation) return;

    let role: string;
    let restSegs: string[];
    let title = "";

    if (fixedSegs) {
      role = fixedSegs[0] ?? "";
      if (kind === "folder") {
        const nameSegs = splitCategory(String(formData.get("folderName") ?? ""));
        if (nameSegs.length === 0) return;
        restSegs = [...fixedSegs.slice(1), ...nameSegs];
      } else {
        restSegs = fixedSegs.slice(1);
        title = String(formData.get("title") ?? "").trim();
      }
    } else {
      role = String(formData.get("role") ?? "");
      const segs = splitCategory(String(formData.get("subPath") ?? ""));
      if (segs.length === 0) return;
      if (kind === "folder") {
        restSegs = segs;
      } else {
        title = segs[segs.length - 1];
        restSegs = segs.slice(0, -1);
      }
    }

    if (!canAccessTop(role, affiliation.roles, false)) return;
    const categoryPath = joinCategory([role, ...restSegs]);

    const person = await findPersonByEmail(session.user.email);
    const authorName = person?.name || session.user.email;

    if (kind === "folder") {
      await addFolder({ groupId: id, category: categoryPath, authorName });
    } else {
      const content = String(formData.get("content") ?? "").trim();
      if (!title || !content) return;
      await addDocument({ groupId: id, title, content, authorName, category: categoryPath });
    }

    redirect(
      `/org/${id}/documents/category/${categoryPath
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    );
  }

  const activePath = fixedSegs ?? (prefillSegs.length > 0 ? prefillSegs : [defaultRole]);
  const kindSwitchBase = fixedSegs
    ? ""
    : `?${new URLSearchParams(category ? { category } : {}).toString()}`;

  return (
    <DocumentsLayout groupId={id} activePath={activePath}>
      <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <span aria-hidden>{kind === "folder" ? "📁" : "📝"}</span>
        {kind === "folder" ? "フォルダーを作成" : "文書を作成"}
        {fixedSegs && (
          <span className="text-sm font-normal text-muted">({joinCategory(fixedSegs)} に追加)</span>
        )}
      </h1>

      {!fixedSegs && (
        <div className="flex gap-2 text-sm">
          <Link
            href={`${kindSwitchBase}${kindSwitchBase.includes("?") ? "&" : "?"}kind=document`}
            className={`rounded-none px-3 py-1.5 transition ${
              kind === "document" ? "bg-accent text-white" : "bg-surface text-foreground hover:brightness-110"
            }`}
          >
            文書
          </Link>
          <Link
            href={`${kindSwitchBase}${kindSwitchBase.includes("?") ? "&" : "?"}kind=folder`}
            className={`rounded-none px-3 py-1.5 transition ${
              kind === "folder" ? "bg-accent text-white" : "bg-surface text-foreground hover:brightness-110"
            }`}
          >
            フォルダー
          </Link>
        </div>
      )}

      <form action={createEntry} className="flex min-h-0 flex-1 flex-col gap-3">
        {!fixedSegs && (
          <>
            <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
              フォルダ(ロール)
              <select
                name="role"
                defaultValue={defaultRole}
                className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
              >
                {affiliation.roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
              {kind === "folder" ? "サブフォルダ" : "サブフォルダ/タイトル"}
              <input
                name="subPath"
                type="text"
                defaultValue={defaultSubPath ? `${defaultSubPath}/` : ""}
                placeholder={
                  kind === "folder" ? "例: 月次報告/2026-08" : "例: 月次報告/2026-08/第3回定例会"
                }
                required
                className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
              />
              {kind === "document" && (
                <span className="text-xs text-muted">
                  「/」区切りでサブフォルダを作れます。最後の1区切りがタイトルになります。
                </span>
              )}
            </label>
          </>
        )}

        {fixedSegs && kind === "folder" && (
          <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
            フォルダー名
            <input
              name="folderName"
              type="text"
              placeholder="例: 2026年度"
              required
              className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
          </label>
        )}

        {fixedSegs && kind === "document" && (
          <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
            タイトル
            <input
              name="title"
              type="text"
              placeholder="例: 第3回定例会"
              required
              className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
            />
          </label>
        )}

        {kind === "document" && <MarkdownEditor name="content" />}

        <button
          type="submit"
          className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          保存
        </button>
      </form>
    </DocumentsLayout>
  );
}
