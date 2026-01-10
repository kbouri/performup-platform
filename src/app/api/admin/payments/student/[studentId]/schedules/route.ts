import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { PaymentAllocationService } from "@/lib/services/payment-allocation.service";

/**
 * GET /api/admin/payments/student/[studentId]/schedules
 * Get all payment schedules for a student with allocation details
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { studentId: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const studentId = params.studentId;

        // Verify student exists
        const student = await prisma.student.findUnique({
            where: { id: studentId },
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

        if (!student) {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        // Get all payment schedules for this student
        const schedules = await prisma.paymentSchedule.findMany({
            where: {
                quote: {
                    studentId: studentId,
                },
            },
            include: {
                quote: {
                    select: {
                        id: true,
                        quoteNumber: true,
                        totalAmount: true,
                        currency: true,
                    },
                },
                allocations: {
                    include: {
                        payment: {
                            select: {
                                id: true,
                                paymentDate: true,
                                referenceNumber: true,
                                amount: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
            orderBy: {
                dueDate: "asc",
            },
        });

        // Calculate remaining amount for each schedule
        const schedulesWithRemaining = await Promise.all(
            schedules.map(async (schedule) => {
                const remaining = await PaymentAllocationService.getRemainingAmount(
                    schedule.id
                );

                return {
                    ...schedule,
                    remainingAmount: remaining,
                };
            })
        );

        // Calculate summary by currency
        const summaryMap = new Map<
            string,
            { totalDue: number; totalPaid: number; totalRemaining: number }
        >();

        for (const schedule of schedulesWithRemaining) {
            const currency = schedule.currency;
            const current = summaryMap.get(currency) || {
                totalDue: 0,
                totalPaid: 0,
                totalRemaining: 0,
            };

            current.totalDue += schedule.amount;
            current.totalPaid += schedule.paidAmount;
            current.totalRemaining += schedule.remainingAmount;

            summaryMap.set(currency, current);
        }

        const summary = Array.from(summaryMap.entries()).map(
            ([currency, data]) => ({
                currency,
                ...data,
            })
        );

        return NextResponse.json({
            student: {
                id: student.id,
                user: student.user,
            },
            schedules: schedulesWithRemaining,
            summary,
        });
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error fetching student schedules:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
