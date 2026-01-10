import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { recordProfessorPaymentSchema } from "@/lib/validation/payment.schemas";
import { TransactionJournalService } from "@/lib/services/transaction-journal.service";
import { ValidationService } from "@/lib/services/validation.service";
import { ZodError } from "zod";

/**
 * POST /api/admin/payments/professor
 * Record a payment to a professor for a mission
 */
export async function POST(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

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

        // Calculate remaining amount to pay
        const remainingAmount = mission.amount - mission.paidAmount;

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

        // Run business validations
        const validationResult = await ValidationService.validatePayment({
            personId: validatedData.professorId,
            personType: "PROFESSOR",
            amount: validatedData.amount,
            currency: validatedData.currency,
            paymentDate: new Date(validatedData.paymentDate),
            bankAccountId: validatedData.bankAccountId,
            referenceNumber: validatedData.referenceNumber,
        });

        // Check for blocking errors
        const blockingErrors = validationResult.alerts.filter(
            (alert) => alert.level === "ERROR"
        );
        if (blockingErrors.length > 0) {
            return NextResponse.json(
                {
                    error: "Payment validation failed",
                    details: blockingErrors,
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
                    missionId: validatedData.missionId,
                    amount: validatedData.amount,
                    currency: validatedData.currency,
                    paymentDate: new Date(validatedData.paymentDate),
                    paymentMethod: validatedData.paymentMethod,
                    referenceNumber: validatedData.referenceNumber,
                    bankAccountId: validatedData.bankAccountId,
                    notes: validatedData.notes,
                    type: "PROFESSOR",
                },
            });

            // Update mission paid amount
            const newPaidAmount = mission.paidAmount + validatedData.amount;
            const newStatus = newPaidAmount >= mission.amount ? "PAID" : "VALIDATED";

            const updatedMission = await tx.mission.update({
                where: { id: validatedData.missionId },
                data: {
                    paidAmount: newPaidAmount,
                    status: newStatus,
                },
            });

            // Create journal entries
            const transactions =
                await TransactionJournalService.recordProfessorPayment(
                    {
                        paymentId: payment.id,
                        professorId: validatedData.professorId,
                        missionId: validatedData.missionId,
                        amount: validatedData.amount,
                        currency: validatedData.currency,
                        paymentDate: new Date(validatedData.paymentDate),
                        bankAccountId: validatedData.bankAccountId,
                        referenceNumber: validatedData.referenceNumber,
                    },
                    tx
                );

            return {
                payment,
                mission: updatedMission,
                transactions,
            };
        });

        // Return complete result
        return NextResponse.json(
            {
                payment: result.payment,
                mission: result.mission,
                transactions: result.transactions,
                validationAlerts: validationResult.alerts.filter(
                    (alert) => alert.level !== "ERROR"
                ),
            },
            { status: 201 }
        );
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
        console.error("Error recording professor payment:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
