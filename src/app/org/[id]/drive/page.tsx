import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addCloudLink,
  findActiveAffiliationsByEmail,
  findCloudLinksByGroup,
  findGroupById,
  hasAdminRole,
  removeCloudLink,
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

export default async function DrivePage({
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
  if (!affiliation) {
    notFound();
  }

  const [group, links, isAdmin] = await Promise.all([
    findGroupById(id),
    findCloudLinksByGroup(id),
    hasAdminRole(id, affiliation.roles),
  ]);

  async function addCloudLinkAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation || !(await hasAdminRole(id, affiliation.roles))) return;

    const label = String(formData.get("label") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    if (!label || !url || !isSafeHttpUrl(url)) return;

    await addCloudLink({ groupId: id, label, url });
    revalidatePath(`/org/${id}/drive`);
  }

  async function removeCloudLinkAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation || !(await hasAdminRole(id, affiliation.roles))) return;

    const url = String(formData.get("url") ?? "");
    if (!url) return;

    await removeCloudLink(id, url);
    revalidatePath(`/org/${id}/drive`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>📁</span>
          Drive
        </h1>
        <p className="mt-1 text-sm text-muted">
          団体で使っているGoogleドライブなどのフォルダへのリンクをまとめています。
          クリックすると外部サイトが開きます(別ログインが必要な場合があります)。
        </p>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted">
          まだリンクが登録されていません。
        </p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {links.map((l) => (
            <li
              key={l.url}
              className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3 text-sm transition hover:brightness-110"
            >
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center gap-3"
              >
                <span aria-hidden>📁</span>
                <span className="text-foreground">{l.label}</span>
                <span className="text-xs text-muted">{l.url}</span>
              </a>
              {isAdmin && (
                <form action={removeCloudLinkAction}>
                  <input type="hidden" name="url" value={l.url} />
                  <ConfirmButton
                    message={`「${l.label}」を削除します。よろしいですか?`}
                    className="rounded-none bg-danger/20 px-2 py-1 text-xs text-danger"
                  >
                    削除
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <form action={addCloudLinkAction} className="flex max-w-md flex-col gap-3">
          <h2 className="text-sm text-muted">リンクを追加</h2>
          <input
            name="label"
            type="text"
            placeholder="表示名(例: 会計フォルダ)"
            required
            className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <input
            name="url"
            type="url"
            placeholder="https://drive.google.com/..."
            required
            className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <button
            type="submit"
            className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            追加
          </button>
        </form>
      )}
    </div>
  );
}
