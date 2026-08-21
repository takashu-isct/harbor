import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail, hasAdminRole } from "@/lib/sheet";
import { canAccessTop } from "@/lib/minutesCategory";
import { MinutesBrowser } from "@/components/MinutesBrowser";

export default async function MinutesCategoryPage({
  params,
}: {
  params: Promise<{ id: string; path: string[] }>;
}) {
  const { id, path } = await params;
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
  const prefix = path.map(decodeURIComponent);
  if (!canAccessTop(prefix[0] ?? "", affiliation.roles, isAdmin)) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <MinutesBrowser groupId={id} prefix={prefix} />
    </div>
  );
}
