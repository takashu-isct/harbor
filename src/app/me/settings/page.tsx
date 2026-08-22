import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Moon, Settings, Sun } from "lucide-react";
import { auth } from "@/auth";
import { findPersonByEmail, updatePersonHiddenTools } from "@/lib/sheet";
import { PERSONAL_TOOLS } from "@/lib/tools";
import { BackLink } from "@/components/BackLink";
import { SubmitButton } from "@/components/SubmitButton";
import { btnPrimary } from "@/lib/styles";

export default async function PersonalSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const [person, cookieStore] = await Promise.all([
    findPersonByEmail(session.user.email),
    cookies(),
  ]);
  const hidden = person?.hiddenTools ?? [];
  const currentTheme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  async function saveTheme(formData: FormData) {
    "use server";
    const theme = formData.get("theme") === "light" ? "light" : "dark";
    (await cookies()).set("theme", theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
  }

  async function save(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user?.email) return;

    const newHidden = PERSONAL_TOOLS.filter(
      (t) => formData.get(t.id) !== "on"
    ).map((t) => t.id);
    await updatePersonHiddenTools(session.user.email, newHidden);
    revalidatePath("/me");
    redirect("/me");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <BackLink href="/me">個人ホームに戻る</BackLink>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <Settings className="h-5 w-5" aria-hidden />
          表示設定
        </h1>
        <p className="mt-1 text-sm text-muted">
          個人ホームに表示するツールを選べます。
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm text-muted">テーマ</h2>
        <form action={saveTheme} className="flex max-w-md flex-col gap-3">
          <label className="flex items-center gap-3 bg-surface px-4 py-3 text-sm text-foreground transition-colors duration-150 hover:brightness-110">
            <input
              type="radio"
              name="theme"
              value="dark"
              defaultChecked={currentTheme === "dark"}
            />
            <Moon className="h-4 w-4" aria-hidden />
            ダークモード
          </label>
          <label className="flex items-center gap-3 bg-surface px-4 py-3 text-sm text-foreground transition-colors duration-150 hover:brightness-110">
            <input
              type="radio"
              name="theme"
              value="light"
              defaultChecked={currentTheme === "light"}
            />
            <Sun className="h-4 w-4" aria-hidden />
            ライトモード
          </label>
          <SubmitButton className={`self-start ${btnPrimary}`}>切り替える</SubmitButton>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm text-muted">表示するツール</h2>
        <form action={save} className="flex max-w-md flex-col gap-3">
          {PERSONAL_TOOLS.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 bg-surface px-4 py-3 text-sm text-foreground transition-colors duration-150 hover:brightness-110"
            >
              <input
                type="checkbox"
                name={t.id}
                defaultChecked={!hidden.includes(t.id)}
              />
              <t.icon className="h-4 w-4" aria-hidden />
              {t.label}
            </label>
          ))}
          <SubmitButton className={`self-start ${btnPrimary}`}>保存</SubmitButton>
        </form>
      </section>
    </div>
  );
}
