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
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          console.log("---- NEXTAUTH DEBUG START ----");
          console.log("NEXT_PUBLIC_API_URL value:", apiUrl);
          
          if (!apiUrl) {
            console.error("FATAL: NEXT_PUBLIC_API_URL is undefined!");
          }

          const targetEndpoint = `${apiUrl}/api/auth/google`;
          console.log("Attempting to fetch from:", targetEndpoint);

          const res = await fetch(
            targetEndpoint,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: account.id_token }),
            }
          );
          
          console.log("Backend responded with status:", res.status);
          
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.token;
            token.userId = data.user.id;
            console.log("Successfully received backendToken!");
          } else {
            const errText = await res.text();
            console.error("Backend auth failed! Error response:", errText);
          }
          console.log("---- NEXTAUTH DEBUG END ----");
        } catch (error: any) {
          console.error("Backend auth exception caught:", error.message || error);
          console.log("---- NEXTAUTH DEBUG END ----");
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
