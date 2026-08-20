import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addGroupMember,
  findActiveAffiliationsByEmail,
  findGroupById,
  findGroupMembers,
} from "@/lib/sheet";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation || affiliation.permission !== "admin") {
    notFound();
  }

  const [group, members] = await Promise.all([
    findGroupById(id),
    findGroupMembers(id),
  ]);

  async function addMember(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation || affiliation.permission !== "admin") return;

    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    if (!email || !name) return;

    await addGroupMember({ groupId: id, email, name, role, permission: "member" });
    revalidatePath(`/org/${id}/members`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-foreground">
          メンバー管理
        </h1>
      </div>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="pb-2 font-normal">氏名</th>
            <th className="pb-2 font-normal">メールアドレス</th>
            <th className="pb-2 font-normal">役職</th>
            <th className="pb-2 font-normal">権限</th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {members.map((m) => (
            <tr key={m.email} className="border-t border-surface">
              <td className="py-2">{m.name}</td>
              <td className="py-2">{m.email}</td>
              <td className="py-2">{m.role}</td>
              <td className="py-2">{m.permission}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={addMember} className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm text-muted">メンバーを追加</h2>
        <input
          name="email"
          type="email"
          placeholder="メールアドレス"
          required
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="name"
          type="text"
          placeholder="氏名"
          required
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="role"
          type="text"
          placeholder="役職(例: 部員)"
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          追加
        </button>
      </form>
    </div>
  );
}
