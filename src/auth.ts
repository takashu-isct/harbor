import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // メールアドレスが取れないGoogleアカウントだけ弾く。
      // 「人」シートへの登録有無はアプリ側の画面で判定し、
      // 未登録の人には申請フォームを見せる(拒否して終わりにしない)。
      return !!user.email;
    },
  },
});
