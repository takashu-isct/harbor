import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findMinutesByGroup,
  hasAdminRole,
} from "@/lib/sheet";
import { canAccessCategory } from "@/lib/minutesCategory";
import { MinutesLayout } from "@/components/MinutesLayout";

export default async function MinutesPage({
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
  const allMinutes = await findMinutesByGroup(id);
  const visible = allMinutes
    .filter((m) => canAccessCategory(m.category, affiliation.roles, isAdmin))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <MinutesLayout groupId={id} activePath={[]}>
      <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <span aria-hidden>📝</span>
        最近の議事録
      </h1>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">
          左のフォルダから、議事録を書いてみましょう。
        </p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {visible.map((m) => (
            <li key={m.id}>
              <Link
                href={`/org/${id}/minutes/${m.id}`}
                className="flex flex-col gap-1 bg-surface px-4 py-3 text-sm transition hover:brightness-110"
              >
                <span className="text-xs text-muted">{m.category}</span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-accent/20 text-[10px] font-semibold text-accent">
                    {m.authorName.slice(0, 1)}
                  </span>
                  <span className="text-muted">{m.meetingDate}</span>
                  <span className="text-foreground">{m.title}</span>
                  <span className="ml-auto text-xs text-muted">{m.authorName}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MinutesLayout>
  );
}
