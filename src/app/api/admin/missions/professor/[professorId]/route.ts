import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";

/**
 * GET /api/admin/missions/professor/[professorId]
 * Get all missions for a specific professor with summary
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { professorId: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const professorId = params.professorId;

        // Verify professor exists
        const professor = await prisma.professor.findUnique({
            where: { id: professorId },
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

        if (!professor) {
            return NextResponse.json(
                { error: "Professor not found" },
                { status: 404 }
            );
        }

        // Get all missions for this professor
        const missions = await prisma.mission.findMany({
            where: {
                professorId: professorId,
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
            professor: {
                id: professor.id,
                user: professor.user,
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
        console.error("Error fetching professor missions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
