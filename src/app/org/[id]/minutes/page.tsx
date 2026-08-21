import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findGroupById,
  findMinutesByGroup,
} from "@/lib/sheet";

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

  const [group, minutes] = await Promise.all([
    findGroupById(id),
    findMinutesByGroup(id),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <span aria-hidden>📝</span>
            議事録
          </h1>
          <Link
            href={`/org/${id}/minutes/new`}
            className="rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            議事録を書く
          </Link>
        </div>
      </div>

      {minutes.length === 0 ? (
        <p className="text-sm text-muted">まだ議事録がありません。</p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {minutes.map((m) => (
            <li key={m.id}>
              <Link
                href={`/org/${id}/minutes/${m.id}`}
                className="flex flex-wrap items-center gap-3 bg-surface px-4 py-3 text-sm transition hover:brightness-110"
              >
                <span className="text-muted">{m.meetingDate}</span>
                <span className="text-foreground">{m.title}</span>
                <span className="ml-auto text-xs text-muted">{m.authorName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
