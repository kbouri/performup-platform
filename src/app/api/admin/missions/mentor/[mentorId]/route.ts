import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";

/**
 * GET /api/admin/missions/mentor/[mentorId]
 * Get all missions for a specific mentor with summary
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { mentorId: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const mentorId = params.mentorId;

        // Verify mentor exists
        const mentor = await prisma.mentor.findUnique({
            where: { id: mentorId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!mentor) {
            return NextResponse.json(
                { error: "Mentor not found" },
                { status: 404 }
            );
        }

        // Get all missions for this mentor
        const missions = await prisma.mission.findMany({
            where: {
                mentorId: mentorId,
            },
            include: {
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                    },
                    orderBy: {
                        paymentDate: "desc",
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Calculate summary by currency
        const summaryMap = new Map<
            string,
            { totalEarned: number; totalPending: number; totalValidated: number }
        >();

        for (const mission of missions) {
            const currency = mission.currency;
            const current = summaryMap.get(currency) || {
                totalEarned: 0,
                totalPending: 0,
                totalValidated: 0,
            };

            if (mission.status === "PAID") {
                current.totalEarned += mission.amount;
            } else if (mission.status === "PENDING") {
                current.totalPending += mission.amount;
            } else if (mission.status === "VALIDATED") {
                current.totalValidated += mission.amount;
            }

            summaryMap.set(currency, current);
        }

        const summary = Array.from(summaryMap.entries()).map(
            ([currency, data]) => ({
                currency,
                ...data,
            })
        );

        return NextResponse.json({
            mentor: {
                id: mentor.id,
                user: mentor.user,
            },
            missions,
            summary,
        });
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error fetching mentor missions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
