import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  addMinute,
  findActiveAffiliationsByEmail,
  findGroupById,
  findPersonByEmail,
} from "@/lib/sheet";

export default async function NewMinutePage({
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

  const group = await findGroupById(id);
  const today = new Date().toISOString().slice(0, 10);

  async function createMinute(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const affiliations = await findActiveAffiliationsByEmail(session.user.email);
    if (!affiliations.some((a) => a.groupId === id)) return;

    const title = String(formData.get("title") ?? "").trim();
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
    });
    redirect(`/org/${id}/minutes`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}/minutes`} className="text-sm text-muted underline">
          ← {group?.name ?? id} の議事録一覧に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>📝</span>
          議事録を書く
        </h1>
      </div>

      <form action={createMinute} className="flex max-w-2xl flex-col gap-3">
        <input
          name="title"
          type="text"
          placeholder="タイトル(例: 第3回定例会)"
          required
          className="rounded-none bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
        />
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
    </div>
  );
}
