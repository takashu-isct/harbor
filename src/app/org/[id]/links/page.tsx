import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addLink,
  findActiveAffiliationsByEmail,
  findGroupById,
  findLinksByOwner,
  isAdminRole,
  removeLink,
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

export default async function LinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(id);

  const [group, links] = await Promise.all([
    findGroupById(id),
    findLinksByOwner(id),
  ]);

  async function addLinkAction(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const label = String(formData.get("label") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const iconUrl = String(formData.get("iconUrl") ?? "").trim();
    if (!label || !url) return;

    await addLink({ ownerId: id, label, url, iconUrl, visibility: "団体" });
    revalidatePath(`/org/${id}/links`);
    revalidatePath(`/org/${id}`);
  }

  async function removeLinkAction(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const url = String(formData.get("url") ?? "");
    if (!url) return;

    await removeLink(id, url);
    revalidatePath(`/org/${id}/links`);
    revalidatePath(`/org/${id}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>🔗</span>
          外部リンクの管理
        </h1>
        <p className="mt-1 text-sm text-muted">
          ここで登録したリンクは、団体画面に別ログインが必要な外部サービスとして表示されます。
        </p>
      </div>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="pb-2 font-normal">表示名</th>
            <th className="pb-2 font-normal">URL</th>
            <th className="pb-2 font-normal"></th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {links.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-3 text-muted">
                まだリンクがありません。
              </td>
            </tr>
          ) : (
            links.map((l) => (
              <tr key={l.url} className="border-t border-surface">
                <td className="py-2">{l.label}</td>
                <td className="py-2 text-muted">{l.url}</td>
                <td className="py-2">
                  <form action={removeLinkAction}>
                    <input type="hidden" name="url" value={l.url} />
                    <button
                      type="submit"
                      className="rounded-md bg-danger/20 px-2 py-1 text-xs text-danger"
                    >
                      削除
                    </button>
                  </form>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <form action={addLinkAction} className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm text-muted">リンクを追加</h2>
        <input
          name="label"
          type="text"
          placeholder="表示名(例: Discordサーバー)"
          required
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="url"
          type="url"
          placeholder="https://..."
          required
          className="rounded-md bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="iconUrl"
          type="url"
          placeholder="アイコン画像URL(任意)"
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
