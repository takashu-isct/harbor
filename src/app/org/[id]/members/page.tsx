import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addGroupMember,
  decideApplication,
  ensureDefaultRoles,
  findActiveAffiliationsByEmail,
  findApplicationsByGroup,
  findGroupById,
  findGroupMembers,
  findRoles,
  isAdminRole,
  removeGroupMember,
  updateGroupMemberPermission,
} from "@/lib/sheet";
import { ConfirmButton } from "@/components/ConfirmButton";

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

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(id);

  const [group, members, roles, applications] = await Promise.all([
    findGroupById(id),
    findGroupMembers(id),
    ensureDefaultRoles(id),
    findApplicationsByGroup(id),
  ]);

  const pendingApplications = applications.filter((a) => a.status === "未処理");

  async function addMember(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    const asAdmin = formData.get("asAdmin") === "on";
    if (!email || !name) return;

    await addGroupMember({
      groupId: id,
      email,
      name,
      role,
      permission: asAdmin ? "管理者" : "メンバー",
    });
    revalidatePath(`/org/${id}/members`);
  }

  async function changeRole(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "");
    const permission = String(formData.get("permission") ?? "");
    if (!email || !permission) return;

    const currentRoles = await findRoles(id);
    const adminRoleNames = new Set(
      currentRoles.filter((r) => r.isAdmin).map((r) => r.name)
    );
    if (!adminRoleNames.has(permission)) {
      const currentMembers = await findGroupMembers(id);
      const target = currentMembers.find(
        (m) => m.email.toLowerCase() === email.toLowerCase()
      );
      const wasAdmin = target && adminRoleNames.has(target.permission);
      const adminCount = currentMembers.filter((m) =>
        adminRoleNames.has(m.permission)
      ).length;
      if (wasAdmin && adminCount <= 1) return;
    }

    await updateGroupMemberPermission({ groupId: id, email, permission });
    revalidatePath(`/org/${id}/members`);
  }

  async function deleteMember(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "");
    if (!email) return;

    const currentRoles = await findRoles(id);
    const adminRoleNames = new Set(
      currentRoles.filter((r) => r.isAdmin).map((r) => r.name)
    );
    const currentMembers = await findGroupMembers(id);
    const target = currentMembers.find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );
    const isTargetAdmin = target && adminRoleNames.has(target.permission);
    const adminCount = currentMembers.filter((m) =>
      adminRoleNames.has(m.permission)
    ).length;
    if (isTargetAdmin && adminCount <= 1) return;

    await removeGroupMember(id, email);
    revalidatePath(`/org/${id}/members`);
  }

  async function approveApplication(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "");
    const name = String(formData.get("name") ?? "");
    const desiredRole = String(formData.get("desiredRole") ?? "");
    const submittedAt = String(formData.get("submittedAt") ?? "");
    if (!email || !submittedAt) return;

    await decideApplication({ groupId: id, email, submittedAt, status: "承認" });
    await addGroupMember({
      groupId: id,
      email,
      name,
      role: desiredRole,
      permission: "メンバー",
    });
    revalidatePath(`/org/${id}/members`);
  }

  async function rejectApplication(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "");
    const submittedAt = String(formData.get("submittedAt") ?? "");
    if (!email || !submittedAt) return;

    await decideApplication({ groupId: id, email, submittedAt, status: "却下" });
    revalidatePath(`/org/${id}/members`);
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <span aria-hidden>👥</span>
            メンバー管理
          </h1>
          <Link href={`/org/${id}/roles`} className="text-sm text-muted underline">
            ロール管理へ
          </Link>
        </div>
      </div>

      {pendingApplications.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm text-muted">
            <span aria-hidden>📋</span>
            タスク・承認待ちの申請({pendingApplications.length}件)
          </h2>
          <ul className="flex flex-col gap-2">
            {pendingApplications.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 rounded-none bg-surface px-4 py-3 text-sm"
              >
                <span className="text-foreground">{a.name || a.email}</span>
                <span className="text-muted">{a.email}</span>
                {a.desiredRole && <span className="text-muted">希望: {a.desiredRole}</span>}
                <form action={approveApplication} className="ml-auto">
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="name" value={a.name} />
                  <input type="hidden" name="desiredRole" value={a.desiredRole} />
                  <input type="hidden" name="submittedAt" value={a.submittedAt} />
                  <button
                    type="submit"
                    className="rounded-none bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                  >
                    承認
                  </button>
                </form>
                <form action={rejectApplication}>
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="submittedAt" value={a.submittedAt} />
                  <button
                    type="submit"
                    className="rounded-none bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition hover:brightness-110"
                  >
                    却下
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs text-muted">
          最後の1人の管理者は、降格・削除できません。
        </p>
        <table className="w-full max-w-3xl text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-2 font-normal">氏名</th>
              <th className="pb-2 font-normal">メールアドレス</th>
              <th className="pb-2 font-normal">役職</th>
              <th className="pb-2 font-normal">ロール</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {members.map((m, i) => (
              <tr key={`${m.email}-${i}`} className="border-t border-surface">
                <td className="py-2">{m.name}</td>
                <td className="py-2">{m.email}</td>
                <td className="py-2">{m.role}</td>
                <td className="py-2">
                  <form action={changeRole} className="flex items-center gap-2">
                    <input type="hidden" name="email" value={m.email} />
                    <select
                      name="permission"
                      defaultValue={m.permission}
                      className="rounded-none bg-surface px-2 py-1 text-xs text-foreground"
                    >
                      {roles.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-none bg-surface px-2 py-1 text-xs text-muted underline"
                    >
                      変更
                    </button>
                  </form>
                </td>
                <td className="py-2">
                  <form action={deleteMember}>
                    <input type="hidden" name="email" value={m.email} />
                    <ConfirmButton
                      message={`${m.name || m.email}をこの団体から削除します。よろしいですか?`}
                      className="rounded-none bg-danger/20 px-2 py-1 text-xs text-danger"
                    >
                      削除
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form action={addMember} className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm text-muted">メンバーを追加</h2>
        <input
          name="email"
          type="email"
          placeholder="メールアドレス"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="name"
          type="text"
          placeholder="氏名"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="role"
          type="text"
          placeholder="役職(例: 部員)"
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="asAdmin" />
          管理者として追加
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
