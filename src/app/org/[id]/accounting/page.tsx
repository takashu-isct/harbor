import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Tags, Wallet } from "lucide-react";
import { auth } from "@/auth";
import {
  addLedgerEntry,
  findActiveAffiliationsByEmail,
  findGroupById,
  findLedgerEntries,
  findLedgerItems,
  hasAdminRole,
} from "@/lib/sheet";
import { BackLink } from "@/components/BackLink";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary, linkMuted } from "@/lib/styles";

export default async function AccountingPage({
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

  const isAdmin = await hasAdminRole(id, affiliation.roles);

  const [group, items, entries] = await Promise.all([
    findGroupById(id),
    findLedgerItems(id),
    isAdmin ? findLedgerEntries(id) : Promise.resolve([]),
  ]);

  const balance = entries.reduce(
    (sum, e) => sum + (e.type === "収入" ? e.amount : -e.amount),
    0
  );

  async function addEntry(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    if (!affiliations.some((a) => a.groupId === id)) return;

    const date = String(formData.get("date") ?? "");
    const description = String(formData.get("description") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const type = formData.get("type") === "支出" ? "支出" : "収入";
    const item = String(formData.get("item") ?? "").trim();
    if (!date || !description || !(amount > 0)) return;

    await addLedgerEntry({
      groupId: id,
      date,
      description,
      amount,
      type,
      recordedBy: session.user.email,
      item,
    });
    revalidatePath(`/org/${id}/accounting`);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <BackLink href={`/org/${id}`}>{group?.name ?? id}団体画面</BackLink>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Wallet className="h-5 w-5" aria-hidden />
            会計
          </h1>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <a href={`/org/${id}/accounting/items`} className={linkMuted}>
                <Tags className="h-3.5 w-3.5" aria-hidden />
                品目管理
              </a>
              <a href={`/org/${id}/accounting/csv`} className={linkMuted}>
                CSVダウンロード
              </a>
            </div>
          )}
        </div>
      </div>

      {isAdmin ? (
        <>
          <p className="text-sm text-muted">
            残高:{" "}
            <span
              className={`text-lg font-semibold ${
                balance < 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {balance.toLocaleString()}円
            </span>
          </p>

          <table className="w-full max-w-2xl text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-2 font-normal">日付</th>
                <th className="pb-2 font-normal">内容</th>
                <th className="pb-2 font-normal">品目</th>
                <th className="pb-2 font-normal">種別</th>
                <th className="pb-2 font-normal">金額</th>
                <th className="pb-2 font-normal">登録者</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-muted">
                    まだ記録がありません。
                  </td>
                </tr>
              ) : (
                entries.map((e, i) => (
                  <tr key={i} className="border-t border-surface">
                    <td className="py-2">{e.date}</td>
                    <td className="py-2">{e.description}</td>
                    <td className="py-2 text-muted">{e.item}</td>
                    <td className="py-2">{e.type}</td>
                    <td className="py-2">{e.amount.toLocaleString()}円</td>
                    <td className="py-2 text-muted">{e.recordedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      ) : (
        <p className="text-sm text-muted">
          残高や記録の一覧は、この団体の管理者のみ見られます。
        </p>
      )}

      <form action={addEntry} className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm text-muted">記録を追加</h2>
        <input
          name="date"
          type="date"
          defaultValue={today}
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
        />
        <input
          name="description"
          type="text"
          placeholder="内容(例: 部費徴収)"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <input
          name="amount"
          type="number"
          min="1"
          placeholder="金額"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <select
          name="type"
          defaultValue="収入"
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="収入">収入</option>
          <option value="支出">支出</option>
        </select>
        <select
          name="item"
          defaultValue=""
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
        >
          <option value="">品目なし</option>
          {items.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {isAdmin && items.length === 0 && (
          <p className="text-xs text-muted">
            「品目管理」から品目を追加すると、ここで選べるようになります。
          </p>
        )}
        <SubmitButton className={`self-start ${btnPrimary}`}>追加</SubmitButton>
      </form>
    </div>
  );
}
