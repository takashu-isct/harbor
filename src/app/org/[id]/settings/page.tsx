import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  findActiveAffiliationsByEmail,
  findGroupById,
  hasAdminRole,
  updateGroupHiddenTools,
} from "@/lib/sheet";
import { ORG_TOOLS } from "@/lib/tools";

async function requireAdmin(id: string) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const affiliations = await findActiveAffiliationsByEmail(session.user.email);
  const affiliation = affiliations.find((a) => a.groupId === id);
  if (!affiliation || !(await hasAdminRole(id, affiliation.roles))) {
    notFound();
  }
}

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(id);

  const group = await findGroupById(id);
  const hidden = group?.hiddenTools ?? [];

  async function save(formData: FormData) {
    "use server";
    await requireAdmin(id);

    const newHidden = ORG_TOOLS.filter((t) => formData.get(t.id) !== "on").map(
      (t) => t.id
    );
    await updateGroupHiddenTools(id, newHidden);
    revalidatePath(`/org/${id}`);
    redirect(`/org/${id}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <Link href={`/org/${id}`} className="text-sm text-muted underline">
          ← {group?.name ?? id} に戻る
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-foreground">
          <span aria-hidden>⚙️</span>
          表示設定
        </h1>
        <p className="mt-1 text-sm text-muted">
          この団体の画面に表示するツールを選べます。
        </p>
      </div>

      <form action={save} className="flex max-w-md flex-col gap-3">
        {ORG_TOOLS.map((t) => (
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
