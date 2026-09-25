import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleIdToken = account.id_token;
        token.name = profile.name;
        token.email = profile.email;
        token.picture = (profile as any).picture;

        // Exchange Google token for our backend JWT
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: account.id_token }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.token;
            token.userId = data.user.id;
          }
        } catch (error) {
          console.error("Backend auth error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).backendToken = token.backendToken;
      (session as any).userId = token.userId;
      if (session.user) {
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
