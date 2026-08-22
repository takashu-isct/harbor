import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addRole,
  ensureDefaultRoles,
  findActiveAffiliationsByEmail,
  findGroupById,
  findGroupMembers,
  findRoles,
  hasAdminRole,
  updateRole,
} from "@/lib/sheet";
import { RoleEditForm } from "@/components/RoleEditForm";
import { UnsavedChangesProvider } from "@/components/UnsavedChangesGuard";

async function requireAdmin(id: string) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation || !(await hasAdminRole(id, affiliation.roles))) {
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

    const currentRoles = await findRoles(id);
    if (currentRoles.some((r) => r.name === name)) return;

    await addRole({ groupId: id, name, isAdmin });
    revalidatePath(`/org/${id}/roles`);
  }

  async function editRole(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const oldName = String(formData.get("oldName") ?? "");
    const newName = String(formData.get("newName") ?? "").trim();
    const isAdmin = formData.get("isAdmin") === "on";
    if (!oldName || !newName) return;

    const currentRoles = await findRoles(id);
    const target = currentRoles.find((r) => r.name === oldName);
    if (!target) return;

    if (newName !== oldName && currentRoles.some((r) => r.name === newName)) return;

    if (target.isAdmin && !isAdmin) {
      const otherAdminNames = new Set(
        currentRoles.filter((r) => r.isAdmin && r.name !== oldName).map((r) => r.name)
      );
      const members = await findGroupMembers(id);
      const stillHasAdmin = members.some((m) => m.roles.some((r) => otherAdminNames.has(r)));
      if (!stillHasAdmin) return;
    }

    await updateRole({ groupId: id, oldName, newName, isAdmin });
    revalidatePath(`/org/${id}/roles`);
    revalidatePath(`/org/${id}/members`);
    revalidatePath(`/org/${id}`);
  }

  return (
    <UnsavedChangesProvider>
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
            {group?.name ?? id} のロール(役職)一覧です。1人に複数のロールを付けられます。
            管理者権限を持つロールが1つでもある人は、このメンバー管理・ロール管理画面を操作できます。
          </p>
          <p className="mt-1 text-xs text-muted">
            団体に管理者が誰もいなくなる変更(最後の管理者権限ロールから権限を外す等)はできません。
            ロール名は団体内で重複できません。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {roles.map((r) => (
            <RoleEditForm key={r.name} role={r} action={editRole} />
          ))}
        </div>

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
    </UnsavedChangesProvider>
  );
}
