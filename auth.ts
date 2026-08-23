import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "wattbund-local-development-secret-only" : undefined),
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens
      })
    : undefined,
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? "not-configured",
      from: process.env.EMAIL_FROM ?? "WattBund <noreply@example.org>"
    })
  ],
  session: { strategy: db ? "database" : "jwt" },
  pages: { signIn: "/anmelden", verifyRequest: "/anmelden/gesendet" },
  callbacks: {
    authorized: async ({ auth: session }) => Boolean(session),
    session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id ?? String(token?.sub ?? "");
        session.user.role = adminEmails.has(session.user.email?.toLowerCase() ?? "") ? "admin" : "member";
      }
      return session;
    }
  }
});
