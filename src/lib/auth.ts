import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "IMTR Credentials",

      credentials: {
        email: {
          label: "Institutional email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email,
          },

          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            password: true,
            isActive: true,
            requiresPasswordChange: true,

            role: {
              select: {
                name: true,
              },
            },
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const passwordIsValid = await compare(password, user.password);

        if (!passwordIsValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          requiresPasswordChange: user.requiresPasswordChange,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;

        token.requiresPasswordChange = user.requiresPasswordChange;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");

        session.user.firstName = String(token.firstName ?? "");

        session.user.lastName = String(token.lastName ?? "");

        session.user.role = String(token.role ?? "");

        session.user.requiresPasswordChange = Boolean(
          token.requiresPasswordChange,
        );
      }

      return session;
    },
  },
});
