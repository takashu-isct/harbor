import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { findPersonByEmail, updatePersonHiddenTools } from "@/lib/sheet";
import { PERSONAL_TOOLS } from "@/lib/tools";

export default async function PersonalSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const person = await findPersonByEmail(session.user.email);
  const hidden = person?.hiddenTools ?? [];

  async function save(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const newHidden = PERSONAL_TOOLS.filter(
      (t) => formData.get(t.id) !== "on"
    ).map((t) => t.id);
    await updatePersonHiddenTools(session.user.email, newHidden);
    revalidatePath("/me");
    revalidatePath("/me/settings");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href="/me" className="text-sm text-muted underline">
          ← 個人ホームに戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>⚙️</span>
          表示設定
        </h1>
        <p className="mt-1 text-sm text-muted">
          個人ホームに表示するツールを選べます。
        </p>
      </div>

      <form action={save} className="flex max-w-md flex-col gap-3">
        {PERSONAL_TOOLS.map((t) => (
          <label
            key={t.id}
            className="flex items-center gap-3 bg-surface px-4 py-3 text-sm text-foreground"
          >
            <input
              type="checkbox"
              name={t.id}
              defaultChecked={!hidden.includes(t.id)}
            />
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </label>
        ))}
        <button
          type="submit"
          className="self-start rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          保存
        </button>
      </form>
    </div>
  );
}
