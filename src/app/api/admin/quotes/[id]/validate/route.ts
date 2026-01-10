import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";

/**
 * POST /api/admin/quotes/[id]/validate
 * Validate a quote (change status from SENT to VALIDATED)
 * This activates the payment schedules
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const quoteId = params.id;

        // Check if quote exists and is in SENT status
        const existingQuote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                paymentSchedules: true,
            },
        });

        if (!existingQuote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        if (existingQuote.status !== "SENT") {
            return NextResponse.json(
                {
                    error: `Cannot validate quote with status ${existingQuote.status}. Only SENT quotes can be validated.`,
                },
                { status: 403 }
            );
        }

        // Update quote status to VALIDATED in a transaction
        // Also activate payment schedules
        const updatedQuote = await prisma.$transaction(async (tx) => {
            // Update quote status
            const quote = await tx.quote.update({
                where: { id: quoteId },
                data: {
                    status: "VALIDATED",
                    validatedAt: new Date(),
                },
                select: {
                    id: true,
                    quoteNumber: true,
                    status: true,
                    validatedAt: true,
                },
            });

            // Update payment schedules to mark them as active
            // Check if any are overdue based on current date
            const now = new Date();
            for (const schedule of existingQuote.paymentSchedules) {
                const isOverdue = schedule.dueDate < now;
                await tx.paymentSchedule.update({
                    where: { id: schedule.id },
                    data: {
                        status: isOverdue ? "OVERDUE" : "PENDING",
                    },
                });
            }

            return quote;
        });

        return NextResponse.json(updatedQuote);
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error validating quote:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
