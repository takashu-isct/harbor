import Link from "next/link";
import { findMinutesByGroup } from "@/lib/sheet";
import { childFolders, joinCategory, splitCategory } from "@/lib/minutesCategory";

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
  const leaves = allMinutes.filter(
    (m) => joinCategory(splitCategory(m.category)) === prefixPath
  );

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href={`/org/${groupId}/minutes`} className="underline">
          議事録
        </Link>
        {prefix.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span>/</span>
            <Link
              href={`/org/${groupId}/minutes/category/${prefix
                .slice(0, i + 1)
                .map(encodeURIComponent)
                .join("/")}`}
              className="underline"
            >
              {seg}
            </Link>
          </span>
        ))}
      </nav>

      <Link
        href={`/org/${groupId}/minutes/new?category=${encodeURIComponent(prefixPath)}`}
        className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
      >
        ここに議事録を書く
      </Link>

      {folders.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm text-muted">フォルダ</h2>
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
        {folders.length > 0 && <h2 className="mb-2 text-sm text-muted">議事録</h2>}
        {leaves.length === 0 ? (
          folders.length === 0 && (
            <p className="text-sm text-muted">まだ議事録がありません。</p>
          )
        ) : (
          <ul className="flex max-w-2xl flex-col gap-2">
            {leaves.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/org/${groupId}/minutes/${m.id}`}
                  className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3 text-sm transition hover:brightness-110"
                >
                  <span className="text-muted">{m.meetingDate}</span>
                  <span className="text-foreground">{m.title}</span>
                  <span className="ml-auto text-xs text-muted">{m.authorName}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
