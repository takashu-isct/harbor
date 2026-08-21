import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  addMinute,
  findActiveAffiliationsByEmail,
  findPersonByEmail,
} from "@/lib/sheet";
import { canAccessTop, joinCategory, splitCategory } from "@/lib/minutesCategory";
import { MinutesLayout } from "@/components/MinutesLayout";

export default async function NewMinutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const { category } = await searchParams;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation) {
    notFound();
  }
  if (affiliation.roles.length === 0) {
    notFound();
  }

  const today = new Date().toISOString().slice(0, 10);

  const prefillSegs = category ? splitCategory(category) : [];
  const defaultRole =
    prefillSegs[0] && affiliation.roles.includes(prefillSegs[0])
      ? prefillSegs[0]
      : affiliation.roles[0];
  const defaultSubPath = joinCategory(prefillSegs.slice(1));

  async function createMinute(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    const affiliation = affiliations.find((a) => a.groupId === id);
    if (!affiliation) return;

    const role = String(formData.get("role") ?? "");
    if (!canAccessTop(role, affiliation.roles, false)) return;

    const pathInput = String(formData.get("pathTitle") ?? "").trim();
    const segs = splitCategory(pathInput);
    if (segs.length === 0) return;
    const title = segs[segs.length - 1];
    const subPath = segs.slice(0, -1);
    const categoryPath = joinCategory([role, ...subPath]);

    const meetingDate = String(formData.get("meetingDate") ?? "");
    const content = String(formData.get("content") ?? "").trim();
    if (!title || !meetingDate || !content) return;

    const person = await findPersonByEmail(session.user.email);
    await addMinute({
      groupId: id,
      title,
      meetingDate,
      content,
      authorName: person?.name || session.user.email,
      category: categoryPath,
    });
    redirect(
      `/org/${id}/minutes/category/${categoryPath
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`
    );
  }

  return (
    <MinutesLayout
      groupId={id}
      activePath={prefillSegs.length > 0 ? prefillSegs : [defaultRole]}
    >
      <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <span aria-hidden>📝</span>
        議事録を書く
      </h1>

      <form action={createMinute} className="flex max-w-2xl flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          フォルダ(ロール)
          <select
            name="role"
            defaultValue={defaultRole}
            className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
          >
            {affiliation.roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          サブフォルダ/タイトル
          <input
            name="pathTitle"
            type="text"
            defaultValue={
              defaultSubPath ? `${defaultSubPath}/` : ""
            }
            placeholder="例: 月次報告/2026-08/第3回定例会"
            required
            className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <span className="text-xs text-muted">
            「/」区切りでサブフォルダを作れます。最後の1区切りがタイトルになります
            (例: 月次報告/2026-08/第3回定例会 → 月次報告/2026-08フォルダに「第3回定例会」を保存)
          </span>
        </label>
        <input
          name="meetingDate"
          type="date"
          defaultValue={today}
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground"
        />
        <textarea
          name="content"
          placeholder="議事録の内容"
          required
          rows={16}
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
        <button
          type="submit"
          className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          保存
        </button>
      </form>
    </MinutesLayout>
  );
}
