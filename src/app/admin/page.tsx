import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ClipboardList, Wrench } from "lucide-react";
import { auth } from "@/auth";
import {
  addGroup,
  addGroupMember,
  decideApplication,
  ensureDefaultRoles,
  findFoundingApplications,
  findGroupById,
  isHarborAdmin,
} from "@/lib/sheet";
import { BackLink } from "@/components/BackLink";
import { SubmitButton } from "@/components/SubmitButton";
import { btnDangerSmall, btnPrimarySmall } from "@/lib/styles";

async function requireHarborAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  if (!(await isHarborAdmin(session.user.email))) {
    notFound();
  }
}

export default async function HarborAdminPage() {
  await requireHarborAdmin();

  const applications = await findFoundingApplications();
  const pending = applications.filter((a) => a.status === "未処理");
  const decided = applications.filter((a) => a.status !== "未処理");

  async function approveFounding(formData: FormData) {
    "use server";
    await requireHarborAdmin();

    const groupId = String(formData.get("groupId") ?? "").trim();
    const groupName = String(formData.get("newGroupName") ?? "");
    const email = String(formData.get("email") ?? "");
    const name = String(formData.get("name") ?? "");
    const submittedAt = String(formData.get("submittedAt") ?? "");
    if (!groupId || !email || !submittedAt) return;
    if (!/^[a-z0-9-]+$/.test(groupId)) return;

    const existing = await findGroupById(groupId);
    if (existing) return;

    await addGroup({
      id: groupId,
      name: groupName,
      status: "活動中",
      foundedAt: new Date().toISOString().slice(0, 10),
    });
    await ensureDefaultRoles(groupId);
    await addGroupMember({
      groupId,
      email,
      name,
      roles: ["管理者"],
    });
    await decideApplication({ groupId: "", email, submittedAt, status: "承認" });
    revalidatePath("/admin");
  }

  async function rejectFounding(formData: FormData) {
    "use server";
    await requireHarborAdmin();

    const email = String(formData.get("email") ?? "");
    const submittedAt = String(formData.get("submittedAt") ?? "");
    if (!email || !submittedAt) return;

    await decideApplication({ groupId: "", email, submittedAt, status: "却下" });
    revalidatePath("/admin");
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-6">
      <div>
        <BackLink href="/me">プロフィールに戻る</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <Wrench className="h-5 w-5" aria-hidden />
          Harbor管理
        </h1>
        <p className="mt-1 text-sm text-muted">
          団体の設立申請を確認し、承認できます。
        </p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm text-muted">
          <ClipboardList className="h-4 w-4" aria-hidden />
          タスク・団体の設立申請({pending.length}件)
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">未処理のタスクはありません。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((a, i) => (
              <li
                key={i}
                className="flex flex-col gap-3 rounded-none bg-surface px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-foreground">{a.newGroupName}</span>
                  <span className="text-muted">
                    {a.name || a.email} ({a.email})
                  </span>
                  <span className="text-muted">希望役職: {a.desiredRole || "-"}</span>
                </div>
                <form
                  action={approveFounding}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="newGroupName" value={a.newGroupName} />
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="name" value={a.name} />
                  <input type="hidden" name="desiredRole" value={a.desiredRole} />
                  <input type="hidden" name="submittedAt" value={a.submittedAt} />
                  <input
                    name="groupId"
                    type="text"
                    required
                    pattern="[a-z0-9-]+"
                    title="半角英小文字・数字・ハイフンのみ使えます"
                    placeholder="団体ID(半角英小文字・数字・ハイフン、例: tea-club)"
                    className="rounded-none bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted"
                  />
                  <SubmitButton className={btnPrimarySmall}>承認して団体を作成</SubmitButton>
                </form>
                <form action={rejectFounding}>
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="submittedAt" value={a.submittedAt} />
                  <SubmitButton className={btnDangerSmall}>却下</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm text-muted">処理済み</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {decided.map((a, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-3 rounded-none bg-surface/50 px-4 py-2"
              >
                <span className="text-foreground">{a.newGroupName}</span>
                <span className="text-muted">{a.email}</span>
                <span className="ml-auto text-muted">{a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
