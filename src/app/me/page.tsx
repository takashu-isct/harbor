import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, Wrench } from "lucide-react";
import { auth, signOut } from "@/auth";
import { findFoundingApplications, findPersonByEmail, isHarborAdmin } from "@/lib/sheet";
import { orderTools, PERSONAL_TOOLS } from "@/lib/tools";
import { AppTile } from "@/components/AppTile";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { linkMuted, linkMutedXs } from "@/lib/styles";

export default async function PersonalHome() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [person, harborAdmin, foundingApplications] = await Promise.all([
    findPersonByEmail(session.user.email),
    isHarborAdmin(session.user.email),
    findFoundingApplications(),
  ]);

  const hiddenTools = person?.hiddenTools ?? [];
  const visibleTools = orderTools(PERSONAL_TOOLS, person?.toolOrder ?? []).filter(
    (t) => !hiddenTools.includes(t.id)
  );
  const foundingPendingCount = foundingApplications.filter(
    (a) => a.status === "未処理"
  ).length;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface px-6 py-4">
        <LocationSwitcher email={session.user.email} current={{ type: "personal" }} />
        <div className="flex items-center gap-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className={linkMuted}>
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-6 py-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-muted">個人</h2>
            <Link href="/me/settings" className={linkMutedXs}>
              <Settings className="h-3.5 w-3.5" aria-hidden />
              表示設定
            </Link>
          </div>
          <div className="flex flex-wrap gap-4">
            {visibleTools.map((t) => (
              <AppTile
                key={t.id}
                href={t.href?.("")}
                disabled={t.disabled}
                icon={t.icon}
                label={t.label}
              />
            ))}
            {harborAdmin && (
              <AppTile
                href="/admin"
                icon={Wrench}
                label="Harbor管理"
                badge={foundingPendingCount || undefined}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
