import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
      };
      session?: {
        id?: string;
        token?: string;
        expiresAt?: Date | string;
        [key: string]: unknown;
      };
      /** Output of validate({ query }) */
      validatedQuery?: Record<string, unknown>;
      /** Output of validate({ params }) */
      validatedParams?: Record<string, string>;
    }
  }
}

export {};
