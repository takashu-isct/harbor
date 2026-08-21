import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addRole,
  ensureDefaultRoles,
  findActiveAffiliationsByEmail,
  findGroupById,
  isAdminRole,
} from "@/lib/sheet";

async function requireAdmin(id: string) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation || !(await isAdminRole(id, affiliation.permission))) {
    notFound();
  }
}

export default async function RolesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(id);

  const [group, roles] = await Promise.all([
    findGroupById(id),
    ensureDefaultRoles(id),
  ]);

  async function createRole(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const name = String(formData.get("name") ?? "").trim();
    const isAdmin = formData.get("isAdmin") === "on";
    if (!name) return;

    await addRole({ groupId: id, name, isAdmin });
    revalidatePath(`/org/${id}/roles`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}/members`} className="text-sm text-muted underline">
          ← メンバー管理に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>🎭</span>
          ロール管理
        </h1>
        <p className="mt-1 text-sm text-muted">
          {group?.name ?? id} のロール一覧です。管理者権限を持つロールに設定された人は、
          このメンバー管理・ロール管理画面を操作できます。
        </p>
      </div>

      <table className="w-full max-w-md text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="pb-2 font-normal">ロール名</th>
            <th className="pb-2 font-normal">管理者権限</th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {roles.map((r) => (
            <tr key={r.name} className="border-t border-surface">
              <td className="py-2">{r.name}</td>
              <td className="py-2">{r.isAdmin ? "あり" : "なし"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={createRole} className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm text-muted">ロールを追加</h2>
        <input
          name="name"
          type="text"
          placeholder="ロール名(例: 会計担当)"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="isAdmin" />
          管理者権限を付与する
        </label>
        <button
          type="submit"
          className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          追加
        </button>
      </form>
    </div>
  );
}
