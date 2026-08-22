import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Folder, HardDrive } from "lucide-react";
import { auth } from "@/auth";
import {
  addCloudLink,
  findActiveAffiliationsByEmail,
  findCloudLinksByGroup,
  findGroupById,
  findRoles,
  hasAdminRole,
  removeCloudLink,
} from "@/lib/sheet";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SubmitButton } from "@/components/SubmitButton";
import { BackLink } from "@/components/BackLink";
import { btnDangerXs, btnPrimary, tileHover } from "@/lib/styles";

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

  const [group, allLinks, roles, isAdmin] = await Promise.all([
    findGroupById(id),
    findCloudLinksByGroup(id),
    findRoles(id),
    hasAdminRole(id, affiliation.roles),
  ]);

  const visibleLinks = allLinks.filter(
    (l) => isAdmin || l.roles.length === 0 || l.roles.some((r) => affiliation.roles.includes(r))
  );

  async function addCloudLinkAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation || !(await hasAdminRole(id, affiliation.roles))) return;

    const label = String(formData.get("label") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const linkRoles = formData.getAll("roles").map(String);
    const permission = formData.get("permission") === "writer" ? "writer" : "reader";
    if (!label || !url || !isSafeHttpUrl(url)) return;

    await addCloudLink({ groupId: id, label, url, roles: linkRoles, permission });
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
        <BackLink href={`/org/${id}`}>{group?.name ?? id}団体画面</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <HardDrive className="h-5 w-5" aria-hidden />
          Drive
        </h1>
        <p className="mt-1 text-sm text-muted">
          団体で使っているGoogleドライブなどのフォルダへのリンクをまとめています。
          クリックすると外部サイトが開きます(別ログインが必要な場合があります)。
        </p>
      </div>

      {visibleLinks.length === 0 ? (
        <p className="text-sm text-muted">
          まだリンクが登録されていません。
        </p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {visibleLinks.map((l) => (
            <li
              key={l.url}
              className={`flex flex-wrap items-center gap-3 bg-surface px-4 py-3 text-sm ${tileHover}`}
            >
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 flex-wrap items-center gap-3"
              >
                <Folder className="h-4 w-4 shrink-0" aria-hidden />
                <span className="text-foreground">{l.label}</span>
                <span className="text-xs text-muted">{l.url}</span>
                <span className="ml-auto text-xs text-muted">
                  {l.roles.length > 0 ? l.roles.join("、") : "全員に表示"}
                  ・{l.permission === "writer" ? "編集者" : "閲覧者"}
                </span>
              </a>
              {isAdmin && (
                <form action={removeCloudLinkAction}>
                  <input type="hidden" name="url" value={l.url} />
                  <ConfirmButton
                    message={`「${l.label}」を削除します。よろしいですか?`}
                    className={btnDangerXs}
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
            placeholder="https://drive.google.com/drive/folders/..."
            required
            className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <span className="text-xs text-muted">
            Googleドライブの「フォルダー」のURLを指定してください
            (共有設定は下の内容で毎晩自動的に更新されます)。
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">見せるロール</span>
            {roles.map((r) => (
              <label key={r.name} className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" name="roles" value={r.name} />
                {r.name}
              </label>
            ))}
            <span className="text-xs text-muted">
              どれも選ばない場合は団体に所属する全員に表示されます。選ぶと、選んだロールを
              持つ人(と管理者)にだけ表示されます。
            </span>
          </div>
          <label className="flex max-w-md flex-col gap-1 text-sm text-muted">
            権限
            <select
              name="permission"
              defaultValue="reader"
              className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="reader">閲覧者</option>
              <option value="writer">編集者</option>
            </select>
          </label>
          <SubmitButton className={`self-start ${btnPrimary}`}>追加</SubmitButton>
        </form>
      )}
    </div>
  );
}
