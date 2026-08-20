import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { findActiveAffiliationsByEmail, findGroupById } from "@/lib/sheet";

function LogoutButton() {
  return (
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
  );
}

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);

  if (affiliations.length === 1) {
    redirect(`/org/${affiliations[0].groupId}`);
  }

  if (affiliations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="text-sm text-muted">{session.user.email} でログイン中</p>
        <p className="max-w-sm text-foreground">
          まだ所属がありません。団体の管理者に、団体所属の登録を依頼してください。
        </p>
        <LogoutButton />
      </div>
    );
  }

  const items = await Promise.all(
    affiliations.map(async (a) => ({
      affiliation: a,
      group: await findGroupById(a.groupId),
    }))
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm text-muted">{session.user.email} でログイン中</p>
      <p className="text-foreground">どの立場で開きますか?</p>
      <ul className="flex flex-col gap-3">
        {items.map(({ affiliation, group }) => (
          <li key={affiliation.groupId}>
            <Link
              href={`/org/${affiliation.groupId}`}
              className="rounded-md bg-surface px-6 py-3 text-sm text-foreground transition hover:brightness-110"
            >
              {group?.name ?? affiliation.groupId}({affiliation.role})
            </Link>
          </li>
        ))}
      </ul>
      <LogoutButton />
    </div>
  );
}
