import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findMinuteById,
  hasAdminRole,
} from "@/lib/sheet";
import { canAccessCategory, splitCategory, timeAgo } from "@/lib/minutesCategory";
import { MinutesLayout } from "@/components/MinutesLayout";

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

  const minute = await findMinuteById(id, minuteId);
  if (!minute) {
    notFound();
  }

  const isAdmin = await hasAdminRole(id, affiliation.roles);
  if (!canAccessCategory(minute.category, affiliation.roles, isAdmin)) {
    notFound();
  }

  const categoryPath = splitCategory(minute.category);

  return (
    <MinutesLayout groupId={id} activePath={categoryPath}>
      <div>
        <Link
          href={`/org/${id}/minutes/category/${categoryPath.map(encodeURIComponent).join("/")}`}
          className="text-sm text-muted underline"
        >
          ← {minute.category}
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>📝</span>
          {minute.title}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
            {minute.authorName.slice(0, 1)}
          </span>
          {minute.meetingDate} ・ {minute.authorName} ・ {timeAgo(minute.createdAt)}
        </p>
      </div>

      <div className="max-w-2xl whitespace-pre-wrap bg-surface px-4 py-4 text-sm text-foreground">
        {minute.content}
      </div>
    </MinutesLayout>
  );
}
