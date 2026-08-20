import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findGroupById,
  findPersonByEmail,
} from "@/lib/sheet";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [person, affiliations] = await Promise.all([
    findPersonByEmail(session.user.email),
    findActiveAffiliationsByEmail(session.user.email),
  ]);

  const groups = await Promise.all(
    affiliations.map(async (a) => ({
      affiliation: a,
      group: await findGroupById(a.groupId),
    }))
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface px-6 py-4">
        <p className="text-sm text-muted">
          今の立場: <span className="text-foreground">個人</span>
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-sm text-muted underline">
            ログアウト
          </button>
        </form>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-6 py-6">
        <section>
          <h1 className="mb-3 text-xl font-semibold text-foreground">
            プロフィール
          </h1>
          <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">氏名</dt>
            <dd className="text-foreground">{person?.name ?? "未登録"}</dd>
            <dt className="text-muted">メールアドレス</dt>
            <dd className="text-foreground">{session.user.email}</dd>
            <dt className="text-muted">登録日</dt>
            <dd className="text-foreground">{person?.registeredAt ?? "-"}</dd>
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            所属団体
          </h2>
          {groups.length === 0 ? (
            <p className="text-sm text-muted">まだ所属がありません。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {groups.map(({ affiliation, group }) => (
                <li key={affiliation.groupId}>
                  <Link
                    href={`/org/${affiliation.groupId}`}
                    className="text-sm text-foreground underline"
                  >
                    {group?.name ?? affiliation.groupId}
                  </Link>
                  <span className="ml-1 text-sm text-muted">
                    ({affiliation.role})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            自分の申請一覧
          </h2>
          <p className="text-sm text-muted">準備中です。</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            個人参加のイベント
          </h2>
          <p className="text-sm text-muted">準備中です。</p>
        </section>
      </main>
    </div>
  );
}
