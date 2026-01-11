import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/students/[id]/payment-schedules/[scheduleId] - Update schedule
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
    try {
        const { id, scheduleId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const { amount, dueDate, status, type } = body;

        const data: any = {};
        if (amount !== undefined) data.amount = parseInt(amount);
        if (dueDate) data.dueDate = new Date(dueDate);
        if (status) data.status = status;
        if (type) data.type = type;

        const updated = await prisma.paymentSchedule.update({
            where: {
                id: scheduleId,
                studentId: id
            },
            data
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating payment schedule:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour" },
            { status: 500 }
        );
    }
}

// DELETE /api/students/[id]/payment-schedules/[scheduleId]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
    try {
        const { id, scheduleId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        await prisma.paymentSchedule.delete({
            where: {
                id: scheduleId,
                studentId: id
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting payment schedule:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression" },
            { status: 500 }
        );
    }
}
