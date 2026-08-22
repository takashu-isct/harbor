import Link from "next/link";
import { FileText, Folder, SquarePen } from "lucide-react";
import { findDocumentsByGroup } from "@/lib/sheet";
import { childFolders, joinCategory, splitCategory, timeAgo } from "@/lib/documentCategory";
import { btnPrimary, btnSecondary, linkMutedXs, tileHover } from "@/lib/styles";

// prefix は必ず1階層以上(先頭はロール名)。呼び出し側でアクセス権を確認してから使うこと。
// エクスプローラーのフォルダのように、直下(このフォルダ自体)の中身だけを表示する。
export async function DocumentsBrowser({
  groupId,
  prefix,
  canWrite,
}: {
  groupId: string;
  prefix: string[];
  canWrite: boolean;
}) {
  const allDocuments = await findDocumentsByGroup(groupId);
  const folders = childFolders(
    allDocuments.map((m) => m.category),
    prefix
  );
  const prefixPath = joinCategory(prefix);
  const documents = allDocuments
    .filter((m) => !m.isFolder && joinCategory(splitCategory(m.category)) === prefixPath)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Folder className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex flex-wrap items-center gap-1">
            <Link href={`/org/${groupId}/documents`} className="hover:underline">
              文書管理
            </Link>
            {prefix.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted">/</span>
                <Link
                  href={`/org/${groupId}/documents/category/${prefix
                    .slice(0, i + 1)
                    .map(encodeURIComponent)
                    .join("/")}`}
                  className="hover:underline"
                >
                  {seg}
                </Link>
              </span>
            ))}
          </span>
        </h1>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/org/${groupId}/documents/new?category=${encodeURIComponent(prefixPath)}&fixed=1&kind=folder`}
              className={btnSecondary}
            >
              フォルダーを作成
            </Link>
            <Link
              href={`/org/${groupId}/documents/new?category=${encodeURIComponent(prefixPath)}&fixed=1&kind=document`}
              className={btnPrimary}
            >
              文書を作成
            </Link>
          </div>
        )}
      </div>

      {folders.length === 0 && documents.length === 0 ? (
        <p className="text-sm text-muted">このフォルダは空です。</p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {folders.map((f) => (
            <li key={`folder-${f}`}>
              <Link
                href={`/org/${groupId}/documents/category/${[...prefix, f]
                  .map(encodeURIComponent)
                  .join("/")}`}
                className={`flex items-center gap-3 bg-surface px-4 py-3 text-sm text-foreground ${tileHover}`}
              >
                <Folder className="h-4 w-4 shrink-0" aria-hidden />
                {f}
              </Link>
            </li>
          ))}
          {documents.map((m) => (
            <li
              key={m.id}
              className={`flex flex-wrap items-center gap-3 bg-surface px-4 py-3 text-sm ${tileHover}`}
            >
              <Link
                href={`/org/${groupId}/documents/${m.id}`}
                className="flex flex-1 flex-wrap items-center gap-3"
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-foreground">{m.title}</span>
                <span className="ml-auto flex items-center gap-2 text-xs text-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
                    {m.authorName.slice(0, 1)}
                  </span>
                  {m.authorName} ・ {timeAgo(m.createdAt)}
                </span>
              </Link>
              {canWrite && (
                <Link
                  href={`/org/${groupId}/documents/${m.id}/edit`}
                  className={`shrink-0 ${linkMutedXs}`}
                >
                  <SquarePen className="h-3.5 w-3.5" aria-hidden />
                  編集
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
