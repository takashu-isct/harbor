import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findGroupById,
  findRoles,
  hasAdminRole,
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

  const [group, allRoles, isAdmin] = await Promise.all([
    findGroupById(id),
    findRoles(id),
    hasAdminRole(id, affiliation.roles),
  ]);

  const folders = (
    isAdmin ? allRoles.map((r) => r.name) : affiliation.roles
  ).slice().sort();

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>📝</span>
          議事録
        </h1>
        <p className="mt-1 text-sm text-muted">
          自分の持つロールのフォルダにだけ書き込めます。管理者はすべてのフォルダを見られます。
        </p>
      </div>

      {folders.length === 0 ? (
        <p className="text-sm text-muted">アクセスできるフォルダがありません。</p>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-2">
          {folders.map((f) => (
            <li key={f}>
              <Link
                href={`/org/${id}/minutes/category/${encodeURIComponent(f)}`}
                className="flex items-center gap-2 bg-surface px-4 py-3 text-sm text-foreground transition hover:brightness-110"
              >
                <span aria-hidden>📁</span>
                {f}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
