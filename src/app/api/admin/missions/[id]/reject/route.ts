import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { rejectMissionSchema } from "@/lib/validation/mission.schemas";
import { ZodError } from "zod";

/**
 * POST /api/admin/missions/[id]/reject
 * Reject a mission (change status from PENDING to REJECTED)
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
                    error: `Cannot reject mission with status ${existingMission.status}. Only PENDING missions can be rejected.`,
                },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await req.json();
        const validatedData = rejectMissionSchema.parse(body);

        // Update mission status to REJECTED
        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: {
                status: "REJECTED",
                rejectedAt: new Date(),
                rejectionReason: validatedData.reason,
            },
            select: {
                id: true,
                status: true,
                rejectedAt: true,
                rejectionReason: true,
                description: true,
                amount: true,
                currency: true,
            },
        });

        return NextResponse.json(updatedMission);
    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error rejecting mission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
