import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { userService } from '@/lib/services/user.service';
import { verifyPassword } from '@/lib/utils/password';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await userService.getUserByEmail(credentials.email);
        if (!user || !user.password) {
          console.log('Utilisateur non trouvé ou sans mot de passe');
          return null;
        }

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          console.log('Mot de passe incorrect');
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          profileType: user.profileType,
          organizationId: user.organizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; profileType?: string; organizationId?: string };
        token.id = u.id;
        token.profileType = u.profileType;
        token.organizationId = u.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const sessionUser = session.user as { id?: string; profileType?: string; organizationId?: string };
        sessionUser.id = token.id as string;
        sessionUser.profileType = token.profileType as string;
        sessionUser.organizationId = token.organizationId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
