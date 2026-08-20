import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findPersonByEmail } from "@/lib/sheet";

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
      if (!user.email) return false;
      const person = await findPersonByEmail(user.email);
      return !!person;
    },
  },
});
