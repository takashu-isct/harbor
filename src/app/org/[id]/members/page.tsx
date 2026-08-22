import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ClipboardList, Users } from "lucide-react";
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
  hasAdminRole,
  removeGroupMember,
  updateGroupMemberRoles,
} from "@/lib/sheet";
import { ConfirmButton } from "@/components/ConfirmButton";
import { AddMemberModal } from "@/components/AddMemberModal";
import { MemberRoleForm } from "@/components/MemberRoleForm";
import { UnsavedChangesProvider } from "@/components/UnsavedChangesGuard";
import { BackLink } from "@/components/BackLink";
import { SubmitButton } from "@/components/SubmitButton";
import { btnDangerSmall, btnDangerXs, btnPrimarySmall, linkMuted } from "@/lib/styles";

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
  // 「メンバー」ロールが無い団体では、管理者権限ではない先頭のロールを既定でチェックする
  // (何もチェックされないまま追加・承認され、権限0のメンバーができてしまうのを防ぐ)。
  const defaultRoleName =
    roles.find((r) => r.name === "メンバー")?.name ?? roles.find((r) => !r.isAdmin)?.name;

  async function addMember(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const roles = formData.getAll("roles").map(String);
    if (!email || !name) return;

    await addGroupMember({ groupId: id, email, name, roles });
    revalidatePath(`/org/${id}/members`);
  }

  async function changeRoles(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const email = String(formData.get("email") ?? "");
    const newRoles = formData.getAll("roles").map(String);
    if (!email) return;

    const currentRoles = await findRoles(id);
    const adminRoleNames = new Set(
      currentRoles.filter((r) => r.isAdmin).map((r) => r.name)
    );
    const willBeAdmin = newRoles.some((r) => adminRoleNames.has(r));
    if (!willBeAdmin) {
      const currentMembers = await findGroupMembers(id);
      const target = currentMembers.find(
        (m) => m.email.toLowerCase() === email.toLowerCase()
      );
      const wasAdmin = target?.roles.some((r) => adminRoleNames.has(r));
      const adminCount = currentMembers.filter((m) =>
        m.roles.some((r) => adminRoleNames.has(r))
      ).length;
      if (wasAdmin && adminCount <= 1) return;
    }

    await updateGroupMemberRoles({ groupId: id, email, roles: newRoles });
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
    const isTargetAdmin = target?.roles.some((r) => adminRoleNames.has(r));
    const adminCount = currentMembers.filter((m) =>
      m.roles.some((r) => adminRoleNames.has(r))
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
    const submittedAt = String(formData.get("submittedAt") ?? "");
    const roles = formData.getAll("roles").map(String);
    if (!email || !submittedAt) return;

    await decideApplication({ groupId: id, email, submittedAt, status: "承認" });
    await addGroupMember({ groupId: id, email, name, roles });
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
    <UnsavedChangesProvider>
    <div className="flex flex-1 flex-col gap-8 px-6 py-6">
      <div>
        <BackLink href={`/org/${id}`}>{group?.name ?? id} に戻る</BackLink>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Users className="h-5 w-5" aria-hidden />
            メンバー管理
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <a href={`/org/${id}/members/csv`} className={linkMuted}>
              CSVダウンロード
            </a>
            <Link href={`/org/${id}/roles`} className={linkMuted}>
              ロール管理へ
            </Link>
            <AddMemberModal action={addMember} roles={roles} />
          </div>
        </div>
      </div>

      {pendingApplications.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm text-muted">
            <ClipboardList className="h-4 w-4" aria-hidden />
            タスク・承認待ちの申請({pendingApplications.length}件)
          </h2>
          <ul className="flex flex-col gap-3">
            {pendingApplications.map((a, i) => (
              <li
                key={i}
                className="flex flex-col gap-3 rounded-none bg-surface px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-foreground">{a.name || a.email}</span>
                  <span className="text-muted">{a.email}</span>
                  {a.desiredRole && (
                    <span className="text-muted">希望: {a.desiredRole}</span>
                  )}
                </div>
                <form
                  action={approveApplication}
                  className="flex flex-wrap items-center gap-3"
                >
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="name" value={a.name} />
                  <input type="hidden" name="submittedAt" value={a.submittedAt} />
                  {roles.map((r) => {
                    const desiredMatches = roles.some((x) => x.name === a.desiredRole);
                    const checked = desiredMatches
                      ? r.name === a.desiredRole
                      : r.name === defaultRoleName;
                    return (
                      <label
                        key={r.name}
                        className="flex items-center gap-1 text-xs text-muted"
                      >
                        <input
                          type="checkbox"
                          name="roles"
                          value={r.name}
                          defaultChecked={checked}
                        />
                        {r.name}
                      </label>
                    );
                  })}
                  <SubmitButton className={btnPrimarySmall}>承認</SubmitButton>
                </form>
                <form action={rejectApplication}>
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="submittedAt" value={a.submittedAt} />
                  <SubmitButton className={btnDangerSmall}>却下</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs text-muted">
          最後の1人の管理者は、降格・削除できません。ロールは1人に複数付けられます。
        </p>
        <table className="w-full max-w-3xl text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="pb-2 font-normal">氏名</th>
              <th className="pb-2 font-normal">メールアドレス</th>
              <th className="pb-2 font-normal">ロール</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {members.map((m, i) => (
              <tr key={`${m.email}-${i}`} className="border-t border-surface">
                <td className="py-2">{m.name}</td>
                <td className="py-2">{m.email}</td>
                <td className="py-2">
                  <MemberRoleForm
                    email={m.email}
                    roles={roles}
                    memberRoles={m.roles}
                    action={changeRoles}
                  />
                </td>
                <td className="py-2">
                  <form action={deleteMember}>
                    <input type="hidden" name="email" value={m.email} />
                    <ConfirmButton
                      message={`${m.name || m.email}をこの団体から削除します。よろしいですか?`}
                      className={btnDangerXs}
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
    </div>
    </UnsavedChangesProvider>
  );
}
