import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail, hasAdminRole } from "@/lib/sheet";
import { canAccessTop } from "@/lib/minutesCategory";
import { MinutesLayout } from "@/components/MinutesLayout";
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
    <MinutesLayout groupId={id} activePath={prefix}>
      <MinutesBrowser groupId={id} prefix={prefix} />
    </MinutesLayout>
  );
}
