import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { findActiveAffiliationsByEmail } from "@/lib/sheet";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm text-muted">{session.user.email} でログイン中</p>

      {affiliations.length === 0 ? (
        <p className="max-w-sm text-foreground">
          まだ所属がありません。団体の管理者に、団体所属の登録を依頼してください。
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-foreground">ログインできました。</p>
          <ul className="text-sm text-muted">
            {affiliations.map((a) => (
              <li key={a.groupId}>
                {a.groupId} / {a.role}
              </li>
            ))}
          </ul>
        </div>
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
  );
}
