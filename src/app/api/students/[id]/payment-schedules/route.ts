import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/students/[id]/payment-schedules - Create a payment schedule
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const { type, amount, dueDate, currency } = body;

        const schedule = await prisma.paymentSchedule.create({
            data: {
                studentId: id,
                type: type || "STUDENT_PAYMENT",
                amount: parseInt(amount), // Amount in cents
                dueDate: new Date(dueDate),
                currency: currency || "EUR",
                scheduleCurrency: currency || "EUR",
                status: "PENDING"
            }
        });

        return NextResponse.json(schedule, { status: 201 });
    } catch (error) {
        console.error("Error creating payment schedule:", error);
        return NextResponse.json(
            { error: "Erreur lors de la création de l'échéance" },
            { status: 500 }
        );
    }
}
