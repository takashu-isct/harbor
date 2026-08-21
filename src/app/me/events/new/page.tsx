import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function NewPersonalEventPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href="/me" className="text-sm text-muted underline">
          ← プロフィールに戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>🎉</span>
          イベントを企画する
        </h1>
      </div>
      <p className="text-sm text-muted">準備中です。もうしばらくお待ちください。</p>
    </div>
  );
}
