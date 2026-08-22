import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail, hasAdminRole } from "@/lib/sheet";
import { canAccessTop } from "@/lib/documentCategory";
import { DocumentsLayout } from "@/components/DocumentsLayout";
import { DocumentsBrowser } from "@/components/DocumentsBrowser";

export default async function DocumentsCategoryPage({
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
  const canWrite = canAccessTop(prefix[0] ?? "", affiliation.roles, false);

  return (
    <DocumentsLayout groupId={id} activePath={prefix}>
      <DocumentsBrowser groupId={id} prefix={prefix} canWrite={canWrite} />
    </DocumentsLayout>
  );
}
