import { notFound, redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { auth } from "@/auth";
import { findActiveAffiliationsByEmail } from "@/lib/sheet";
import { BackLink } from "@/components/BackLink";

export default async function NewOrgEventPage({
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

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <BackLink href={`/org/${id}/events`}>イベント</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <PartyPopper className="h-5 w-5" aria-hidden />
          イベントを企画する
        </h1>
      </div>
      <p className="text-sm text-muted">準備中です。もうしばらくお待ちください。</p>
    </div>
  );
}
