import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addRole,
  ensureDefaultRoles,
  findActiveAffiliationsByEmail,
  findGroupById,
  hasAdminRole,
  updateRole,
} from "@/lib/sheet";

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

    await updateRole({ groupId: id, oldName, newName, isAdmin });
    revalidatePath(`/org/${id}/roles`);
    revalidatePath(`/org/${id}/members`);
    revalidatePath(`/org/${id}`);
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
          {group?.name ?? id} のロール(役職)一覧です。1人に複数のロールを付けられます。
          管理者権限を持つロールが1つでもある人は、このメンバー管理・ロール管理画面を操作できます。
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {roles.map((r) => (
          <form
            key={r.name}
            action={editRole}
            className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3"
          >
            <input type="hidden" name="oldName" value={r.name} />
            <input
              name="newName"
              type="text"
              defaultValue={r.name}
              required
              className="rounded-none bg-background px-3 py-1.5 text-sm text-foreground"
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="isAdmin" defaultChecked={r.isAdmin} />
              管理者権限
            </label>
            <button
              type="submit"
              className="rounded-none bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
            >
              更新
            </button>
          </form>
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
  );
}
