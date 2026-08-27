import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, pool } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { verifyAdminPassword } from "@/lib/admin-password";

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
    Credentials({
      id: "admin-password",
      name: "Admin-Zugang",
      credentials: {
        email: { label: "E-Mail-Adresse", type: "email" },
        password: { label: "Passwort", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials.email ?? "").trim().toLowerCase();
        const password = String(credentials.password ?? "");

        if (!adminEmails.has(email)) return null;
        if (!verifyAdminPassword(password, process.env.ADMIN_PASSWORD_HASH)) return null;
        if (!pool) return null;

        const result = await pool.query<{ id: string; email: string; name: string | null }>(
          `INSERT INTO users (email, name, email_verified, role)
           VALUES ($1, 'WattBund Admin', now(), 'admin')
           ON CONFLICT (email) DO UPDATE SET
             role = 'admin',
             email_verified = COALESCE(users.email_verified, now()),
             deleted_at = NULL
           RETURNING id, email, name`,
          [email]
        );
        const user = result.rows[0];
        if (!user) return null;

        return { id: user.id, email: user.email, name: user.name ?? "WattBund Admin" };
      }
    }),
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY ?? "not-configured",
      from: process.env.EMAIL_FROM ?? "WattBund <noreply@example.org>"
    })
  ],
  session: { strategy: "jwt" },
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
