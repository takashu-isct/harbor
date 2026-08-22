import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Tags } from "lucide-react";
import { auth } from "@/auth";
import {
  addLedgerItem,
  findActiveAffiliationsByEmail,
  findGroupById,
  findLedgerItems,
  hasAdminRole,
  removeLedgerItem,
} from "@/lib/sheet";
import { BackLink } from "@/components/BackLink";
import { SubmitButton } from "@/components/SubmitButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { btnDangerXs, btnPrimary, tileHover } from "@/lib/styles";

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

export default async function AccountingItemsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(id);

  const [group, items] = await Promise.all([findGroupById(id), findLedgerItems(id)]);

  async function createItem(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const currentItems = await findLedgerItems(id);
    if (currentItems.includes(name)) return;

    await addLedgerItem(id, name);
    revalidatePath(`/org/${id}/accounting/items`);
    revalidatePath(`/org/${id}/accounting`);
  }

  async function deleteItem(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const name = String(formData.get("name") ?? "");
    if (!name) return;

    await removeLedgerItem(id, name);
    revalidatePath(`/org/${id}/accounting/items`);
    revalidatePath(`/org/${id}/accounting`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <BackLink href={`/org/${id}/accounting`}>会計</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <Tags className="h-5 w-5" aria-hidden />
          品目管理
        </h1>
        <p className="mt-1 text-sm text-muted">
          {group?.name ?? id} の会計で選べる品目(内訳の種類)一覧です。会計画面の記録追加フォームで選べます。
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">まだ品目がありません。</p>
      ) : (
        <ul className="flex max-w-md flex-col gap-2">
          {items.map((name) => (
            <li
              key={name}
              className={`flex items-center justify-between gap-3 bg-surface px-4 py-3 text-sm text-foreground ${tileHover}`}
            >
              {name}
              <form action={deleteItem}>
                <input type="hidden" name="name" value={name} />
                <ConfirmButton
                  message={`品目「${name}」を削除します。よろしいですか?`}
                  className={btnDangerXs}
                >
                  削除
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={createItem} className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm text-muted">品目を追加</h2>
        <input
          name="name"
          type="text"
          placeholder="品目名(例: 部費、備品購入)"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <SubmitButton className={`self-start ${btnPrimary}`}>追加</SubmitButton>
      </form>
    </div>
  );
}
