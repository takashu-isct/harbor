import Link from "next/link";
import { findMinutesByGroup } from "@/lib/sheet";
import {
  childFolders,
  isUnderPrefix,
  joinCategory,
  splitCategory,
  timeAgo,
} from "@/lib/minutesCategory";

// prefix は必ず1階層以上(先頭はロール名)。呼び出し側でアクセス権を確認してから使うこと。
export async function MinutesBrowser({
  groupId,
  prefix,
}: {
  groupId: string;
  prefix: string[];
}) {
  const allMinutes = await findMinutesByGroup(groupId);
  const folders = childFolders(
    allMinutes.map((m) => m.category),
    prefix
  );
  const prefixPath = joinCategory(prefix);
  // esaと同じく、このフォルダ配下(サブフォルダ含む)の議事録を全部表示する
  const items = allMinutes
    .filter((m) => isUnderPrefix(m.category, prefix))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <span aria-hidden>📁</span>
          <span className="flex flex-wrap items-center gap-1">
            <Link href={`/org/${groupId}/minutes`} className="hover:underline">
              議事録
            </Link>
            {prefix.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-muted">/</span>
                <Link
                  href={`/org/${groupId}/minutes/category/${prefix
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
          {items.length > 0 && (
            <span className="text-sm font-normal text-muted">{items.length}</span>
          )}
        </h1>
        <Link
          href={`/org/${groupId}/minutes/new?category=${encodeURIComponent(prefixPath)}`}
          className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          ここに議事録を書く
        </Link>
      </div>

      {folders.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs text-muted">フォルダ</h2>
          <ul className="flex max-w-2xl flex-col gap-2">
            {folders.map((f) => (
              <li key={f}>
                <Link
                  href={`/org/${groupId}/minutes/category/${[...prefix, f]
                    .map(encodeURIComponent)
                    .join("/")}`}
                  className="flex items-center gap-2 bg-surface px-4 py-3 text-sm text-foreground transition hover:brightness-110"
                >
                  <span aria-hidden>📁</span>
                  {f}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        {folders.length > 0 && <h2 className="mb-2 text-xs text-muted">議事録</h2>}
        {items.length === 0 ? (
          folders.length === 0 && (
            <p className="text-sm text-muted">まだ議事録がありません。</p>
          )
        ) : (
          <ul className="flex max-w-2xl flex-col gap-2">
            {items.map((m) => {
              const subSegs = splitCategory(m.category).slice(prefix.length);
              return (
                <li key={m.id}>
                  <Link
                    href={`/org/${groupId}/minutes/${m.id}`}
                    className="flex flex-col gap-1 bg-surface px-4 py-3 text-sm transition hover:brightness-110"
                  >
                    {subSegs.length > 0 && (
                      <span className="text-xs text-muted">{subSegs.join("/")}</span>
                    )}
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
                        {m.authorName.slice(0, 1)}
                      </span>
                      <span className="text-muted">{m.meetingDate}</span>
                      <span className="text-foreground">{m.title}</span>
                      <span className="ml-auto text-xs text-muted">
                        {m.authorName} ・ {timeAgo(m.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
