import { auth } from "../auth";

/**
 * RBAC Middleware for API routes
 * Provides role-based access control for protected endpoints
 */

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
}

/**
 * Require admin role for the request
 * @param req - The incoming request
 * @returns The authenticated admin user or throws an error
 */
export async function requireAdmin(
    req: Request
): Promise<AuthenticatedUser> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (session.user.role !== "ADMIN") {
        throw new Response(
            JSON.stringify({ error: "Forbidden - Admin access required" }),
            {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    return session.user as AuthenticatedUser;
}

/**
 * Require a specific role for the request
 * @param req - The incoming request
 * @param role - The required role
 * @returns The authenticated user or throws an error
 */
export async function requireRole(
    req: Request,
    role: string
): Promise<AuthenticatedUser> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (session.user.role !== role) {
        throw new Response(
            JSON.stringify({ error: `Forbidden - ${role} access required` }),
            {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    return session.user as AuthenticatedUser;
}

/**
 * Require one of multiple roles for the request
 * @param req - The incoming request
 * @param roles - Array of acceptable roles
 * @returns The authenticated user or throws an error
 */
export async function requireAnyRole(
    req: Request,
    roles: string[]
): Promise<AuthenticatedUser> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    if (!roles.includes(session.user.role)) {
        throw new Response(
            JSON.stringify({
                error: `Forbidden - One of [${roles.join(", ")}] roles required`,
            }),
            {
                status: 403,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    return session.user as AuthenticatedUser;
}

/**
 * Get the current authenticated user (if any)
 * @param req - The incoming request
 * @returns The authenticated user or null
 */
export async function getCurrentUser(
    req: Request
): Promise<AuthenticatedUser | null> {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
        return null;
    }

    return session.user as AuthenticatedUser;
}
