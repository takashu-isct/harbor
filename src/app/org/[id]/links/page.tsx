import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addLink,
  findActiveAffiliationsByEmail,
  findGroupById,
  findLinksByOwner,
  hasAdminRole,
  removeLink,
} from "@/lib/sheet";
import { ConfirmButton } from "@/components/ConfirmButton";

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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
    if (!label || !url || !isSafeHttpUrl(url)) return;
    if (iconUrl && !isSafeHttpUrl(iconUrl)) return;

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
          外部リンクを追加
        </h1>
        <p className="mt-1 text-sm text-muted">
          Discordやスプレッドシートなど、団体で使っている外部サービスへのリンクを登録できます。
          登録したリンクは団体画面に「別ログインが必要」と表示されます。
        </p>
      </div>

      <form action={addLinkAction} className="flex max-w-md flex-col gap-3">
        <input
          name="label"
          type="text"
          placeholder="表示名(例: Discordサーバー)"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="url"
          type="url"
          placeholder="https://..."
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="iconUrl"
          type="url"
          placeholder="アイコン画像URL(任意)"
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <p className="text-xs text-muted">
          アイコン画像URLを入力しない場合は、リンク先サイトのアイコンを自動で表示します。
        </p>
        <button
          type="submit"
          className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          追加
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm text-muted">登録済みのリンク</h2>
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
                      <ConfirmButton
                        message={`「${l.label}」を削除します。よろしいですか?`}
                        className="rounded-none bg-danger/20 px-2 py-1 text-xs text-danger"
                      >
                        削除
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
