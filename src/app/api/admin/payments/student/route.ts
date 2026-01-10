import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { recordStudentPaymentSchema } from "@/lib/validation/payment.schemas";
import { PaymentAllocationService } from "@/lib/services/payment-allocation.service";
import { TransactionJournalService } from "@/lib/services/transaction-journal.service";
import { ValidationService } from "@/lib/services/validation.service";
import { ZodError } from "zod";

/**
 * POST /api/admin/payments/student
 * Record a student payment with automatic or manual allocation
 */
export async function POST(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        // Parse and validate request body
        const body = await req.json();
        const validatedData = recordStudentPaymentSchema.parse(body);

        // Verify student exists and has STUDENT role
        const student = await prisma.student.findUnique({
            where: { id: validatedData.studentId },
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

        if (!student || student.user.role !== "STUDENT") {
            return NextResponse.json(
                { error: "Invalid student ID" },
                { status: 400 }
            );
        }

        // Verify bank account exists if provided
        if (validatedData.bankAccountId) {
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
        }

        // Run business validations
        const validationResult = await ValidationService.validatePayment({
            personId: validatedData.studentId,
            personType: "STUDENT",
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

        // If manual allocations provided, validate them
        if (validatedData.allocations && validatedData.allocations.length > 0) {
            const allocationValidation =
                await PaymentAllocationService.validateAllocation(
                    validatedData.allocations.map((a) => ({
                        scheduleId: a.scheduleId,
                        amount: a.amount,
                        currency: validatedData.currency,
                    })),
                    validatedData.amount
                );

            if (!allocationValidation.isValid) {
                return NextResponse.json(
                    {
                        error: "Invalid payment allocation",
                        details: allocationValidation.errors,
                    },
                    { status: 400 }
                );
            }
        }

        // Create payment and allocations in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the payment
            const payment = await tx.payment.create({
                data: {
                    studentId: validatedData.studentId,
                    amount: validatedData.amount,
                    currency: validatedData.currency,
                    paymentDate: new Date(validatedData.paymentDate),
                    paymentMethod: validatedData.paymentMethod,
                    referenceNumber: validatedData.referenceNumber,
                    bankAccountId: validatedData.bankAccountId,
                    notes: validatedData.notes,
                    type: "STUDENT",
                },
            });

            // Handle allocations
            let allocations;
            if (validatedData.allocations && validatedData.allocations.length > 0) {
                // Manual allocations
                allocations = await PaymentAllocationService.allocatePayment(
                    payment.id,
                    validatedData.allocations.map((a) => ({
                        scheduleId: a.scheduleId,
                        amount: a.amount,
                        currency: validatedData.currency,
                    })),
                    tx
                );
            } else {
                // Automatic allocation
                const suggestions = await PaymentAllocationService.suggestAllocation(
                    validatedData.studentId,
                    validatedData.amount,
                    validatedData.currency,
                    tx
                );

                if (suggestions.length === 0) {
                    // No schedules to allocate to - this is unusual but not an error
                    // The payment is recorded but not allocated
                    allocations = [];
                } else {
                    allocations = await PaymentAllocationService.allocatePayment(
                        payment.id,
                        suggestions,
                        tx
                    );
                }
            }

            // Update schedule statuses
            const scheduleIds = allocations.map((a) => a.scheduleId);
            for (const scheduleId of scheduleIds) {
                await PaymentAllocationService.updateScheduleStatus(scheduleId, tx);
            }

            // Create journal entries
            const transactions =
                await TransactionJournalService.recordStudentPayment(
                    {
                        paymentId: payment.id,
                        studentId: validatedData.studentId,
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
                allocations,
                transactions,
            };
        });

        // Return complete result
        return NextResponse.json(
            {
                payment: result.payment,
                allocations: result.allocations,
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
        console.error("Error recording student payment:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
