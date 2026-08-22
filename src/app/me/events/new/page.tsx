import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { auth } from "@/auth";
import { BackLink } from "@/components/BackLink";

export default async function NewPersonalEventPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <BackLink href="/me/events">イベント</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <PartyPopper className="h-5 w-5" aria-hidden />
          イベントを企画する
        </h1>
      </div>
      <p className="text-sm text-muted">準備中です。もうしばらくお待ちください。</p>
    </div>
  );
}
