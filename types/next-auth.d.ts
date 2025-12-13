import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      firstName?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    firstName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string;
    firstName?: string;
  }
}

