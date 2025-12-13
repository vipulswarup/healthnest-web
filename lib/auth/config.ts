import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { getDatabase } from '../mongodb';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = await getDatabase();
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({
          emails: credentials.email,
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: credentials.email,
          name: user.firstName,
          firstName: user.firstName,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const db = await getDatabase();
        const usersCollection = db.collection('users');
        
        const existingUser = await usersCollection.findOne({
          emails: user.email,
        });

        if (!existingUser) {
          const nameParts = user.name?.split(' ') || [];
          const firstName = nameParts[0] || 'User';
          await usersCollection.insertOne({
            firstName,
            lastName: nameParts.slice(1).join(' ') || '',
            emails: [user.email || ''],
            mobileNumbers: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            preferences: {},
            onboardingCompleted: false,
            authProvider: 'google',
            authProviderId: account.providerAccountId,
          });
          // Add firstName to user object for JWT token
          (user as any).firstName = firstName;
        } else {
          // Add firstName to user object for JWT token
          (user as any).firstName = existingUser.firstName;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (token.firstName) {
          session.user.firstName = token.firstName as string;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if ('firstName' in user) {
          token.firstName = user.firstName;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

