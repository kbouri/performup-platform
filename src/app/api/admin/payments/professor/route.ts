import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { recordProfessorPaymentSchema } from "@/lib/validation/payment.schemas";
import { ZodError } from "zod";

/**
 * POST /api/admin/payments/professor
 * Record a payment to a professor for a mission
 */
export async function POST(req: NextRequest) {
    try {
        // Check admin authentication
        const adminUser = await requireAdmin(req);

        // Parse and validate request body
        const body = await req.json();
        const validatedData = recordProfessorPaymentSchema.parse(body);

        // Verify professor exists and has PROFESSOR role
        const professor = await prisma.professor.findUnique({
            where: { id: validatedData.professorId },
            include: {
                user: {
                    select: {
                        id: true,
                        role: true,
                        name: true,
                        email: true,
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

        // Verify mission exists, belongs to professor, and is validated
        const mission = await prisma.mission.findUnique({
            where: { id: validatedData.missionId },
            include: {
                transactions: {
                    where: { type: "PROFESSOR_PAYMENT" },
                    select: { amount: true },
                },
            },
        });

        if (!mission) {
            return NextResponse.json(
                { error: "Mission not found" },
                { status: 404 }
            );
        }

        if (mission.professorId !== validatedData.professorId) {
            return NextResponse.json(
                { error: "Mission does not belong to this professor" },
                { status: 400 }
            );
        }

        if (mission.status !== "VALIDATED") {
            return NextResponse.json(
                {
                    error: `Cannot pay for mission with status ${mission.status}. Only VALIDATED missions can be paid.`,
                },
                { status: 403 }
            );
        }

        // Verify currency matches
        if (mission.currency !== validatedData.currency) {
            return NextResponse.json(
                {
                    error: `Payment currency (${validatedData.currency}) does not match mission currency (${mission.currency})`,
                },
                { status: 400 }
            );
        }

        // Calculate paid amount from existing transactions
        const paidAmount = mission.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const remainingAmount = mission.amount - paidAmount;

        if (validatedData.amount > remainingAmount) {
            return NextResponse.json(
                {
                    error: `Payment amount (${validatedData.amount}) exceeds remaining mission amount (${remainingAmount})`,
                },
                { status: 400 }
            );
        }

        // Verify bank account exists
        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id: validatedData.bankAccountId },
        });

        if (!bankAccount) {
            return NextResponse.json(
                { error: "Bank account not found" },
                { status: 400 }
            );
        }

        // Validate account currency matches payment currency
        if (bankAccount.currency !== validatedData.currency) {
            return NextResponse.json(
                {
                    error: `Bank account currency (${bankAccount.currency}) does not match payment currency (${validatedData.currency})`,
                },
                { status: 400 }
            );
        }

        // Create payment and update mission in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the payment
            const payment = await tx.payment.create({
                data: {
                    professorId: validatedData.professorId,
                    amount: validatedData.amount,
                    currency: validatedData.currency,
                    paymentDate: new Date(validatedData.paymentDate),
                    paymentMethod: validatedData.paymentMethod,
                    referenceNumber: validatedData.referenceNumber,
                    bankAccountId: validatedData.bankAccountId,
                    notes: validatedData.notes,
                    receivedBy: adminUser.id,
                    status: "VALIDATED",
                },
            });

            // Update mission status if fully paid
            const newPaidAmount = paidAmount + validatedData.amount;
            const newStatus = newPaidAmount >= mission.amount ? "PAID" : "VALIDATED";

            const updatedMission = await tx.mission.update({
                where: { id: validatedData.missionId },
                data: {
                    status: newStatus,
                    paidAt: newStatus === "PAID" ? new Date() : undefined,
                },
            });

            // Create transaction entry for accounting
            const transaction = await tx.transaction.create({
                data: {
                    transactionNumber: `TX-PRF-${Date.now()}`,
                    date: new Date(validatedData.paymentDate),
                    type: "PROFESSOR_PAYMENT",
                    amount: validatedData.amount,
                    currency: validatedData.currency,
                    description: `Payment to professor ${professor.user.name} for mission ${mission.title}`,
                    sourceAccountId: validatedData.bankAccountId,
                    paymentId: payment.id,
                    professorId: validatedData.professorId,
                    missionId: validatedData.missionId,
                },
            });

            return {
                payment,
                mission: updatedMission,
                transaction,
            };
        });

        // Return complete result
        return NextResponse.json(
            {
                payment: result.payment,
                mission: result.mission,
                transaction: result.transaction,
            },
            { status: 201 }
        );
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
        console.error("Error recording professor payment:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
