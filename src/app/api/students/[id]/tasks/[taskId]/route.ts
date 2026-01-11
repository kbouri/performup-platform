import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/students/[id]/tasks/[taskId] - Update task
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; taskId: string }> }
) {
    try {
        const { id, taskId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, category, dueDate, status, completed } = body;

        const data: any = {};
        if (title) data.title = title;
        if (description !== undefined) data.description = description;
        if (category) data.category = category;
        if (dueDate) data.dueDate = new Date(dueDate);
        if (completed !== undefined) {
            data.completed = completed;
            data.completedAt = completed ? new Date() : null;
        }

        const updated = await prisma.task.update({
            where: {
                id: taskId,
                studentId: id
            },
            data
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating task:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour" },
            { status: 500 }
        );
    }
}

// DELETE /api/students/[id]/tasks/[taskId]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; taskId: string }> }
) {
    try {
        const { id, taskId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        await prisma.task.delete({
            where: {
                id: taskId,
                studentId: id
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression" },
            { status: 500 }
        );
    }
}
