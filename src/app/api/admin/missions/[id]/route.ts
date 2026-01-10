import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { updateMissionSchema } from "@/lib/validation/mission.schemas";
import { ZodError } from "zod";

/**
 * GET /api/admin/missions/[id]
 * Get detailed information about a specific mission
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const missionId = params.id;

        // Fetch mission with all related data
        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            include: {
                mentor: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                professor: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                transactions: {
                    select: {
                        id: true,
                        amount: true,
                        currency: true,
                        date: true,
                        type: true,
                    },
                    orderBy: {
                        date: "desc",
                    },
                },
            },
        });

        if (!mission) {
            return NextResponse.json(
                { error: "Mission not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(mission);
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error fetching mission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/missions/[id]
 * Update a mission (only if status is PENDING)
 */
export async function PUT(
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
                    error: `Cannot update mission with status ${existingMission.status}. Only PENDING missions can be updated.`,
                },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await req.json();
        const validatedData = updateMissionSchema.parse(body);

        // If no updates provided, return current mission
        if (Object.keys(validatedData).length === 0) {
            return NextResponse.json(existingMission);
        }

        // Prepare update data
        const updateData: Record<string, string | number | Date | null> = {};

        if (validatedData.description !== undefined) {
            updateData.description = validatedData.description;
        }
        if (validatedData.amount !== undefined) {
            updateData.amount = validatedData.amount;
        }
        if (validatedData.currency !== undefined) {
            updateData.currency = validatedData.currency;
        }
        if (validatedData.startDate !== undefined) {
            updateData.startDate = new Date(validatedData.startDate);
        }
        if (validatedData.endDate !== undefined) {
            updateData.endDate = new Date(validatedData.endDate);
        }
        if (validatedData.notes !== undefined) {
            updateData.notes = validatedData.notes;
        }

        // Update mission
        const updatedMission = await prisma.mission.update({
            where: { id: missionId },
            data: updateData,
            include: {
                mentor: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                professor: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(updatedMission);
    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error updating mission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
