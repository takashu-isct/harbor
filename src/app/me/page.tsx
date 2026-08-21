import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { findPersonByEmail, isHarborAdmin } from "@/lib/sheet";
import { PERSONAL_TOOLS } from "@/lib/tools";
import { AppTile } from "@/components/AppTile";

export default async function PersonalHome() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [person, harborAdmin] = await Promise.all([
    findPersonByEmail(session.user.email),
    isHarborAdmin(session.user.email),
  ]);

  const hiddenTools = person?.hiddenTools ?? [];
  const visibleTools = PERSONAL_TOOLS.filter((t) => !hiddenTools.includes(t.id));

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface px-6 py-4">
        <p className="text-sm text-muted">
          今の立場: <span className="text-foreground">個人</span>
        </p>
        <div className="flex items-center gap-4">
          {harborAdmin && (
            <Link href="/admin" className="text-sm text-accent underline">
              🛠️ Harbor管理
            </Link>
          )}
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
          <h2 className="mb-3 text-sm text-muted">個人</h2>
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
            <AppTile href="/me/settings" icon="⚙️" label="表示設定" />
          </div>
        </section>
      </main>
    </div>
  );
}
