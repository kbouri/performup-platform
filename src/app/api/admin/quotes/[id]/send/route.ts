import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";

/**
 * POST /api/admin/quotes/[id]/send
 * Send a quote to the student (change status from DRAFT to SENT)
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const quoteId = params.id;

        // Check if quote exists and is in DRAFT status
        const existingQuote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                email: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!existingQuote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        if (existingQuote.status !== "DRAFT") {
            return NextResponse.json(
                {
                    error: `Cannot send quote with status ${existingQuote.status}. Only DRAFT quotes can be sent.`,
                },
                { status: 403 }
            );
        }

        // Update quote status to SENT
        const updatedQuote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                status: "SENT",
                sentAt: new Date(),
            },
            select: {
                id: true,
                quoteNumber: true,
                status: true,
                sentAt: true,
            },
        });

        // TODO: Send email notification to student
        // This would typically use a service like SendGrid, Resend, or similar
        // Example:
        // await sendQuoteEmail({
        //   to: existingQuote.student.user.email,
        //   studentName: existingQuote.student.user.name,
        //   quoteNumber: existingQuote.quoteNumber,
        //   quoteId: existingQuote.id,
        // });

        return NextResponse.json(updatedQuote);
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error sending quote:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
