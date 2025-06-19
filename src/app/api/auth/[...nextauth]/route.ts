import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        console.log("[NextAuth] Authorize called");
        console.log("[NextAuth] Credentials:", credentials);
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[NextAuth] Missing credentials");
            return null;
          }
          const user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (!user) {
            console.log("[NextAuth] No user found for email", credentials.email);
            return null;
          }
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            console.log("[NextAuth] Invalid password for user", credentials.email);
            return null;
          }
          console.log("[NextAuth] Auth success for user", user.email);
          // Return only safe user fields
          return { id: user.id, email: user.email };
        } catch (err) {
          console.log("[NextAuth] Exception in authorize:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
