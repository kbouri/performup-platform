import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/students/[id]/schools/[appId] - Update application
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; appId: string }> }
) {
    try {
        const { id, appId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const { priority, status, notes } = body;

        const updated = await prisma.studentSchoolApplication.update({
            where: {
                id: appId,
                studentId: id
            },
            data: {
                priority,
                status,
                notes
            },
            include: {
                school: true,
                program: true
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating application:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour" },
            { status: 500 }
        );
    }
}

// DELETE /api/students/[id]/schools/[appId]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; appId: string }> }
) {
    try {
        const { id, appId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        await prisma.studentSchoolApplication.delete({
            where: {
                id: appId,
                studentId: id
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting application:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression" },
            { status: 500 }
        );
    }
}
