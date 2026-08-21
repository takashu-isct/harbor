import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findGroupById,
  findMinuteById,
} from "@/lib/sheet";

export default async function MinuteDetailPage({
  params,
}: {
  params: Promise<{ id: string; minuteId: string }>;
}) {
  const { id, minuteId } = await params;
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation) {
    notFound();
  }

  const [group, minute] = await Promise.all([
    findGroupById(id),
    findMinuteById(id, minuteId),
  ]);
  if (!minute) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}/minutes`} className="text-sm text-muted underline">
          ← {group?.name ?? id} の議事録一覧に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>📝</span>
          {minute.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {minute.meetingDate} ・ {minute.authorName}
        </p>
      </div>

      <div className="max-w-2xl whitespace-pre-wrap bg-surface px-4 py-4 text-sm text-foreground">
        {minute.content}
      </div>
    </div>
  );
}
