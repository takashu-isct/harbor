import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/login" className="text-sm text-muted underline">
          ← ログイン画面に戻る
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-foreground">
          Harbor 利用規約
        </h1>
      </div>

      <section className="flex flex-col gap-2 text-sm text-foreground">
        <h2 className="text-base font-semibold">1. このサービスについて</h2>
        <p>
          Harbor(以下「本サービス」)は、東京科学大学の学生団体CREWが開発・運営する、
          学生団体の運営を1箇所にまとめるためのWebサービスです。
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm text-foreground">
        <h2 className="text-base font-semibold">2. ログインと取得する情報</h2>
        <p>
          本サービスはGoogleアカウントによるログインのみに対応しています。
          ログインの際にGoogleから取得する氏名・メールアドレスなどの情報は、
          本サービス内での権限管理および本人確認(認証)の目的にのみ利用し、
          それ以外の目的には利用しません。
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm text-foreground">
        <h2 className="text-base font-semibold">3. 情報の管理</h2>
        <p>
          登録された氏名・メールアドレス・所属団体・役職などの情報は、
          CREW執行部および開発部のみがアクセスできる環境で管理します。
          本人の同意なく第三者へ提供することはありません。
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm text-foreground">
        <h2 className="text-base font-semibold">4. 規約の変更</h2>
        <p>
          本規約の内容を変更する場合は、変更内容を利用者に通知したうえで、
          あらためて同意を得るものとします。
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm text-foreground">
        <h2 className="text-base font-semibold">5. お問い合わせ</h2>
        <p>本サービスに関するお問い合わせは、CREW開発部までご連絡ください。</p>
      </section>
    </div>
  );
}
