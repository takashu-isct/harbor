import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { findActiveAffiliationsByEmail, findGroupById } from "@/lib/sheet";

const TABS = [
  { icon: "📁", label: "Drive" },
  { icon: "📄", label: "文書" },
  { icon: "📅", label: "イベント" },
];

export default async function OrgHome({
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

  const group = await findGroupById(id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface px-6 py-4">
        <p className="text-sm text-muted">
          今の立場:{" "}
          <span className="text-foreground">{group?.name ?? id}</span>
          <span className="ml-1">({affiliation.role})</span>
        </p>
        <div className="flex items-center gap-4">
          <Link href="/me" className="text-sm text-muted underline">
            プロフィール
          </Link>
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
        </div>
      </header>

      <nav className="flex gap-6 border-b border-surface px-6 py-3 text-sm text-muted">
        <Link
          href={`/org/${id}/accounting`}
          className="flex items-center gap-1.5 text-foreground underline"
        >
          <span aria-hidden>💰</span>
          会計
        </Link>
        {TABS.map(({ icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span aria-hidden>{icon}</span>
            {label}
          </span>
        ))}
        {affiliation.permission === "admin" && (
          <Link
            href={`/org/${id}/members`}
            className="flex items-center gap-1.5 text-foreground underline"
          >
            <span aria-hidden>👥</span>
            メンバー管理
          </Link>
        )}
      </nav>

      <main className="flex flex-1 items-center justify-center text-muted">
        準備中です。
      </main>
    </div>
  );
}
