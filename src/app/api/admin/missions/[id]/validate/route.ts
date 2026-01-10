import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";

/**
 * POST /api/admin/missions/[id]/validate
 * Validate a mission (change status from PENDING to VALIDATED)
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const missionId = params.id;

        // Check if mission exists and is in PENDING status
        const existingMission = await prisma.mission.findUnique({
            where: { id: missionId },
        });

        if (!existingMission) {
            return NextResponse.json(
                { error: "Mission not found" },
                { status: 404 }
            );
        }

        if (existingMission.status !== "PENDING") {
            return NextResponse.json(
                {
                    error: `Cannot validate mission with status ${existingMission.status}. Only PENDING missions can be validated.`,
                },
                { status: 403 }
            );
        }

        // Update mission status to VALIDATED
        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: {
                status: "VALIDATED",
                validatedAt: new Date(),
            },
            select: {
                id: true,
                status: true,
                validatedAt: true,
                description: true,
                amount: true,
                currency: true,
            },
        });

        return NextResponse.json(updatedMission);
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error validating mission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
