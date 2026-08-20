import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findGroupById,
  findLinksByOwner,
  isAdminRole,
} from "@/lib/sheet";

function AppTile({
  href,
  external,
  disabled,
  icon,
  iconUrl,
  label,
  note,
}: {
  href?: string;
  external?: boolean;
  disabled?: boolean;
  icon?: string;
  iconUrl?: string;
  label: string;
  note?: string;
}) {
  const inner = (
    <div className="flex w-20 flex-col items-center gap-1.5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-2xl">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-8 w-8 rounded" />
        ) : (
          <span aria-hidden>{icon}</span>
        )}
      </div>
      <span className="text-xs text-foreground">{label}</span>
      {note && <span className="text-[10px] text-muted">{note}</span>}
    </div>
  );

  if (disabled || !href) {
    return <div className="opacity-50">{inner}</div>;
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

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

  const [group, links, isAdmin] = await Promise.all([
    findGroupById(id),
    findLinksByOwner(id),
    isAdminRole(id, affiliation.permission),
  ]);

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

      <main className="flex flex-1 flex-col gap-8 px-6 py-6">
        <section>
          <h2 className="mb-3 text-sm text-muted">Harbor</h2>
          <div className="flex flex-wrap gap-4">
            <AppTile href={`/org/${id}/accounting`} icon="💰" label="会計" />
            <AppTile disabled icon="📁" label="Drive" />
            <AppTile disabled icon="📄" label="文書" />
            <AppTile disabled icon="📅" label="イベント" />
            {isAdmin && (
              <AppTile
                href={`/org/${id}/members`}
                icon="👥"
                label="メンバー管理"
              />
            )}
            {isAdmin && (
              <AppTile href={`/org/${id}/roles`} icon="🎭" label="ロール管理" />
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm text-muted">外部リンク</h2>
          <div className="flex flex-wrap gap-4">
            {links.map((l) => (
              <AppTile
                key={l.url}
                href={l.url}
                external
                icon="🔗"
                iconUrl={l.iconUrl || undefined}
                label={l.label}
                note="別ログイン"
              />
            ))}
            {isAdmin && (
              <AppTile
                href={`/org/${id}/links`}
                icon="➕"
                label="リンクを追加"
              />
            )}
            {links.length === 0 && !isAdmin && (
              <p className="text-sm text-muted">まだリンクがありません。</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
