import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";

/**
 * GET /api/admin/payments/[id]
 * Get detailed information about a specific payment
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const paymentId = params.id;

        // Fetch payment with all related data
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                student: {
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
                mission: {
                    select: {
                        id: true,
                        description: true,
                        amount: true,
                        paidAmount: true,
                        currency: true,
                        status: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                bankAccount: {
                    select: {
                        id: true,
                        name: true,
                        accountNumber: true,
                        currency: true,
                        balance: true,
                    },
                },
                allocations: {
                    include: {
                        schedule: {
                            include: {
                                quote: {
                                    select: {
                                        id: true,
                                        quoteNumber: true,
                                        totalAmount: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
                transactions: {
                    select: {
                        id: true,
                        transactionNumber: true,
                        type: true,
                        amount: true,
                        currency: true,
                        description: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (!payment) {
            return NextResponse.json(
                { error: "Payment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(payment);
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error fetching payment:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
