import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/students/[id]/tasks - List tasks for a student
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const tasks = await prisma.task.findMany({
            where: { studentId: id },
            orderBy: { dueDate: "asc" },
            include: {
                calendarEvent: true,
                document: true
            }
        });

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return NextResponse.json(
            { error: "Erreur lors de la récupération des tâches" },
            { status: 500 }
        );
    }
}

// POST /api/students/[id]/tasks - Create a task
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
        const { title, description, category, dueDate, timing, durationMinutes } = body;

        // Get the student to find their userId for notification
        const student = await prisma.student.findUnique({
            where: { id },
            select: { userId: true },
        });

        const task = await prisma.task.create({
            data: {
                studentId: id,
                title,
                description,
                category,
                dueDate: new Date(dueDate),
                timing: timing || "STANDALONE",
                durationMinutes: durationMinutes || 60,
                createdBy: session.user.id
            }
        });

        // Create notification for the student
        if (student) {
            const assignerName = session.user.name || session.user.email;
            const dueDateFormatted = new Date(dueDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
            });

            await prisma.notification.create({
                data: {
                    userId: student.userId,
                    type: "TASK_ASSIGNED",
                    title: "📋 Nouvelle tâche assignée",
                    message: `"${title}" - À faire pour le ${dueDateFormatted}`,
                    data: { taskId: task.id, taskTitle: title, assignedBy: assignerName },
                },
            });
        }

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Error creating task:", error);
        return NextResponse.json(
            { error: "Erreur lors de la création de la tâche" },
            { status: 500 }
        );
    }
}
