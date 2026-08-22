import { redirect } from "next/navigation";
import { Calendar, PartyPopper, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { AppTile } from "@/components/AppTile";
import { BackLink } from "@/components/BackLink";

export default async function PersonalEventsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <BackLink href="/me">個人ホームに戻る</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <Calendar className="h-5 w-5" aria-hidden />
          イベント
        </h1>
        <p className="mt-1 text-sm text-muted">
          参加しているイベントはまだありません。
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <AppTile icon={UserPlus} label="イベントに参加する" note="準備中" disabled />
        <AppTile href="/me/events/new" icon={PartyPopper} label="イベントを企画する" />
      </div>
    </div>
  );
}
