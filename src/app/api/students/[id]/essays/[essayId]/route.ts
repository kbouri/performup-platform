import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/students/[id]/essays/[essayId] - Update essay
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; essayId: string }> }
) {
    try {
        const { id, essayId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const { title, content, status } = body;

        const data: any = {};
        if (title) data.title = title;
        if (content !== undefined) data.content = content;
        if (status) data.status = status;

        const updated = await prisma.essay.update({
            where: {
                id: essayId,
                studentId: id
            },
            data,
            include: {
                school: true,
                program: true
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating essay:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour" },
            { status: 500 }
        );
    }
}

// DELETE /api/students/[id]/essays/[essayId]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; essayId: string }> }
) {
    try {
        const { id, essayId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        await prisma.essay.delete({
            where: {
                id: essayId,
                studentId: id
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting essay:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression" },
            { status: 500 }
        );
    }
}
