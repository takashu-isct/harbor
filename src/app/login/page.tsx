import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Harbor</h1>
        <p className="text-sm text-muted">
          学生団体の運営を1箇所にまとめるWebサービス
        </p>
      </div>

      {error && (
        <p className="max-w-sm rounded-md bg-surface px-4 py-3 text-center text-sm text-danger">
          ログインに失敗しました。もう一度お試しください。
        </p>
      )}

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-accent px-6 py-3 text-sm font-medium text-white transition hover:brightness-110"
        >
          Googleでログイン
        </button>
      </form>
    </div>
  );
}
