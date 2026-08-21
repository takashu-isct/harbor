import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findApplicationsByGroup,
  findFoundingApplications,
  findGroupById,
  findLinksByOwner,
  hasAdminRole,
  isHarborAdmin,
} from "@/lib/sheet";
import { ORG_TOOLS } from "@/lib/tools";
import { AddTile, AppTile } from "@/components/AppTile";
import { LocationSwitcher } from "@/components/LocationSwitcher";

function faviconFor(url: string): string | undefined {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  } catch {
    return undefined;
  }
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

  const [group, links, isAdmin, harborAdmin, applications, foundingApplications] =
    await Promise.all([
      findGroupById(id),
      findLinksByOwner(id),
      hasAdminRole(id, affiliation.roles),
      isHarborAdmin(session.user.email),
      findApplicationsByGroup(id),
      findFoundingApplications(),
    ]);

  const hiddenTools = group?.hiddenTools ?? [];
  const visibleTools = ORG_TOOLS.filter((t) => !hiddenTools.includes(t.id));
  const pendingCount = applications.filter((a) => a.status === "未処理").length;
  const foundingPendingCount = foundingApplications.filter(
    (a) => a.status === "未処理"
  ).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface px-6 py-4">
        <LocationSwitcher
          email={session.user.email}
          current={{
            type: "org",
            id,
            roles: affiliation.roles,
            groupName: group?.name ?? id,
          }}
        />
        <div className="flex items-center gap-4">
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-muted">CREW Harbor</h2>
            {isAdmin && (
              <Link
                href={`/org/${id}/settings`}
                className="text-xs text-muted underline"
              >
                ⚙️ 表示設定
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {visibleTools.map((t) => (
              <AppTile
                key={t.id}
                href={t.href?.(id)}
                disabled={t.disabled}
                icon={t.icon}
                label={t.label}
              />
            ))}
            {isAdmin && (
              <AppTile
                href={`/org/${id}/members`}
                icon="👥"
                label="メンバー管理"
                badge={pendingCount || undefined}
              />
            )}
            {isAdmin && (
              <AppTile href={`/org/${id}/roles`} icon="🎭" label="ロール管理" />
            )}
            {harborAdmin && (
              <AppTile
                href="/admin"
                icon="🛠️"
                label="Harbor管理"
                badge={foundingPendingCount || undefined}
              />
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-muted">外部リンク</h2>
            {isAdmin && (
              <Link
                href={`/org/${id}/links`}
                className="text-xs text-muted underline"
              >
                ⚙️ リンク管理
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {links.map((l) => (
              <AppTile
                key={l.url}
                href={l.url}
                external
                icon="🔗"
                iconUrl={l.iconUrl || faviconFor(l.url)}
                label={l.label}
                note="別ログイン"
              />
            ))}
            {isAdmin && (
              <AddTile href={`/org/${id}/links`} label="リンクを追加" />
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
