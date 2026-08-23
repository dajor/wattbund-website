import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "member" | "admin";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
