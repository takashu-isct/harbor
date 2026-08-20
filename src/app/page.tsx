import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import {
  addApplication,
  findActiveAffiliationsByEmail,
  findAllGroups,
  findApplicationsByEmail,
  findGroupById,
  findPersonByEmail,
} from "@/lib/sheet";

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

async function ApplicationGate({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const [groups, applications] = await Promise.all([
    findAllGroups(),
    findApplicationsByEmail(email),
  ]);

  async function submitApplication(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const groupId = String(formData.get("groupId") ?? "");
    const desiredRole = String(formData.get("desiredRole") ?? "").trim();
    if (!groupId) return;

    await addApplication({
      groupId,
      email: session.user.email,
      name: session.user.name ?? "",
      desiredRole,
    });
    revalidatePath("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm text-muted">{email} でログイン中</p>
      <p className="max-w-sm text-foreground">
        まだHarborに登録されていません。所属したい団体に申請できます。
        管理者が承認すると使えるようになります。
      </p>

      {applications.length > 0 && (
        <div className="w-full max-w-sm text-left">
          <h2 className="mb-2 text-sm text-muted">これまでの申請</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {applications.map((a, i) => (
              <li key={i} className="flex justify-between text-foreground">
                <span>{a.groupId}</span>
                <span className="text-muted">{a.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        action={submitApplication}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <select
          name="groupId"
          required
          defaultValue=""
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="" disabled>
            団体を選択
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={email}
          readOnly
          className="rounded-md bg-surface px-3 py-2 text-sm text-muted"
        />
        <input
          name="desiredRole"
          type="text"
          placeholder="希望する役職(任意、例: 一般部員)"
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-white transition hover:brightness-110"
        >
          申請する
        </button>
      </form>

      <LogoutButton />
    </div>
  );
}

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const person = await findPersonByEmail(session.user.email);
  if (!person) {
    return (
      <ApplicationGate email={session.user.email} name={session.user.name ?? ""} />
    );
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
        <Link
          href="/me"
          className="flex items-center gap-2 rounded-md bg-surface px-6 py-3 text-sm text-foreground transition hover:brightness-110"
        >
          <span aria-hidden>🙍</span>
          個人プロフィールを見る
        </Link>
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
              className="flex items-center gap-2 rounded-md bg-surface px-6 py-3 text-sm text-foreground transition hover:brightness-110"
            >
              <span aria-hidden>🏢</span>
              {group?.name ?? affiliation.groupId}({affiliation.role})
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/me"
            className="flex items-center gap-2 rounded-md bg-surface px-6 py-3 text-sm text-foreground transition hover:brightness-110"
          >
            <span aria-hidden>🙍</span>
            個人
          </Link>
        </li>
      </ul>
      <LogoutButton />
    </div>
  );
}
