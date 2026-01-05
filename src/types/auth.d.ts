import "better-auth";

declare module "better-auth" {
  interface User {
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    active?: boolean;
  }
}

declare module "better-auth/react" {
  interface User {
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    active?: boolean;
  }
}

