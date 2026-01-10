import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import {
    createMissionSchema,
    listMissionsSchema,
} from "@/lib/validation/mission.schemas";
import { ZodError } from "zod";

/**
 * POST /api/admin/missions
 * Create a new mission for a mentor or professor
 */
export async function POST(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        // Parse and validate request body
        const body = await req.json();
        const validatedData = createMissionSchema.parse(body);

        // Verify mentor or professor exists based on type
        if (validatedData.type === "MENTOR") {
            const mentor = await prisma.mentor.findUnique({
                where: { id: validatedData.mentorId },
                include: {
                    user: {
                        select: {
                            role: true,
                        },
                    },
                },
            });

            if (!mentor || mentor.user.role !== "MENTOR") {
                return NextResponse.json(
                    { error: "Invalid mentor ID" },
                    { status: 400 }
                );
            }
        } else if (validatedData.type === "PROFESSOR") {
            const professor = await prisma.professor.findUnique({
                where: { id: validatedData.professorId },
                include: {
                    user: {
                        select: {
                            role: true,
                        },
                    },
                },
            });

            if (!professor || professor.user.role !== "PROFESSOR") {
                return NextResponse.json(
                    { error: "Invalid professor ID" },
                    { status: 400 }
                );
            }
        }

        // Create the mission
        const mission = await prisma.mission.create({
            data: {
                mentorId: validatedData.mentorId,
                professorId: validatedData.professorId,
                description: validatedData.description,
                amount: validatedData.amount,
                paidAmount: 0,
                currency: validatedData.currency,
                status: "PENDING",
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                notes: validatedData.notes,
            },
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

        return NextResponse.json(mission, { status: 201 });
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
        console.error("Error creating mission:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/missions
 * List missions with optional filters and pagination
 */
export async function GET(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        // Parse and validate query parameters
        const searchParams = req.nextUrl.searchParams;
        const queryParams = {
            type: searchParams.get("type") ?? undefined,
            mentorId: searchParams.get("mentorId") ?? undefined,
            professorId: searchParams.get("professorId") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            currency: searchParams.get("currency") ?? undefined,
            startDate: searchParams.get("startDate") ?? undefined,
            endDate: searchParams.get("endDate") ?? undefined,
            limit: searchParams.get("limit") ?? "20",
            offset: searchParams.get("offset") ?? "0",
        };

        const validatedParams = listMissionsSchema.parse(queryParams);

        // Build where clause
        const where: any = {};

        if (validatedParams.mentorId) {
            where.mentorId = validatedParams.mentorId;
        }

        if (validatedParams.professorId) {
            where.professorId = validatedParams.professorId;
        }

        if (validatedParams.status) {
            where.status = validatedParams.status;
        }

        if (validatedParams.currency) {
            where.currency = validatedParams.currency;
        }

        if (validatedParams.startDate || validatedParams.endDate) {
            where.startDate = {};
            if (validatedParams.startDate) {
                where.startDate.gte = new Date(validatedParams.startDate);
            }
            if (validatedParams.endDate) {
                where.startDate.lte = new Date(validatedParams.endDate);
            }
        }

        // Get total count
        const total = await prisma.mission.count({ where });

        // Get missions with pagination
        const missions = await prisma.mission.findMany({
            where,
            include: {
                mentor: {
                    include: {
                        user: {
                            select: {
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
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
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
            take: validatedParams.limit,
            skip: validatedParams.offset,
        });

        // Calculate summary by status and currency
        const summaryData = await prisma.mission.groupBy({
            by: ["status", "currency"],
            where,
            _sum: {
                amount: true,
            },
            _count: {
                id: true,
            },
        });

        const summary = summaryData.map((item) => ({
            status: item.status,
            currency: item.currency,
            totalAmount: item._sum.amount ?? 0,
            count: item._count.id,
        }));

        return NextResponse.json({
            missions,
            total,
            hasMore: validatedParams.offset + missions.length < total,
            summary,
        });
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
        console.error("Error listing missions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
