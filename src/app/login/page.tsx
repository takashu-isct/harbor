import Link from "next/link";
import Image from "next/image";
import { BookOpen, KeyRound, Link2, Wallet } from "lucide-react";
import { signIn } from "@/auth";

function LoginButton({ compact }: { compact?: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className={
          compact
            ? "rounded-none bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.97] active:brightness-95"
            : "rounded-none bg-accent px-8 py-3.5 text-base font-medium text-white transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.97] active:brightness-95"
        }
      >
        Googleでログイン
      </button>
    </form>
  );
}

const features = [
  {
    icon: BookOpen,
    title: "引き継ぎがラクになる",
    body: "会計や名簿、リンク集がCREW Harborに積み上がっていく。毎年ゼロから資料を作り直さなくていい。",
  },
  {
    icon: Wallet,
    title: "会計をその場で記帳",
    body: "団体のお金の動きを、所属する人なら誰でもその場で記録・共有できる。",
  },
  {
    icon: KeyRound,
    title: "Googleログインだけ",
    body: "パスワードは増やさない。招待された人だけが、団体・役職に応じた権限で入れる。",
  },
  {
    icon: Link2,
    title: "よく使うツールを1か所に",
    body: "Discordやスプレッドシートなど、団体で使っているサービスへのリンクをホーム画面のように並べられる。",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-surface px-6 py-3">
        <div className="inline-flex items-center rounded-none bg-white px-3 py-1.5">
          <Image
            src="/logo-horizontal.jpg"
            alt="CREW Harbor"
            width={1920}
            height={600}
            priority
            className="h-6 w-auto"
          />
        </div>
        <LoginButton compact />
      </header>

      <section>
        <Image
          src="/hero-sunset.jpg"
          alt="CREW HARBOR 毎年、ゼロから始めない。積み上げてきたものを、次の代へ積み替える場所。"
          width={1600}
          height={900}
          priority
          sizes="100vw"
          className="h-auto w-full"
        />
      </section>

      {error && (
        <p className="mx-auto mt-6 max-w-sm rounded-none bg-surface px-4 py-3 text-center text-sm text-danger">
          ログインに失敗しました。もう一度お試しください。
        </p>
      )}

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold text-foreground">CREW Harborについて</h1>
          <p className="text-sm text-muted">
            CREW Harborは、東京科学大学の学生団体CREWが運営する、学生団体の運営を1箇所にまとめるワークスペースです。
            会計・名簿・権限管理など、団体運営に必要なものをCREW Harborがまとめて次の代へ引き継いでいきます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-1.5 rounded-none bg-surface p-4"
            >
              <f.icon className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">{f.title}</h2>
              <p className="text-xs text-muted">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <LoginButton />
          <p className="text-xs text-muted">
            ログインすると
            <Link href="/terms" className="underline">
              利用規約
            </Link>
            に同意したものとみなします。
          </p>
        </div>
      </section>
    </div>
  );
}
