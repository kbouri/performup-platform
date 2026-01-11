import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/students/[id]/packs/[packId] - Update student pack
// Note: packId here refers to the ID of the StudentPack relation, or the Pack ID?
// Usually endpoints use the resource ID. Let's use StudentPack ID if possible, 
// BUT the frontend might pass the Pack ID if it doesn't track StudentPack ID easily.
// However, the schema has `id` for `StudentPack`. Ideally we use that.
// Let's assume the route param `packId` is actually the `studentPackId` or we look it up.
// Actually, since there is a unique constraint on [studentId, packId], we can use packId and find the relation.
// But to be restful, let's say the [studentPackId] is passed.
// Wait, the previous `GET` returned packs with `id` (StudentPack ID). So we should use that.

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; studentPackId: string }> }
) {
    try {
        const { id, studentPackId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const { customPrice, progressPercent, status, startDate, endDate, notes } = body;

        const updatedStudentPack = await prisma.studentPack.update({
            where: {
                id: studentPackId,
                // We could also enforce studentId check but `id` is globally unique usually.
                // Safety check:
                studentId: id
            },
            data: {
                customPrice,
                progressPercent,
                status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined, // Allow null?
                notes
            },
            include: {
                pack: true
            }
        });

        return NextResponse.json(updatedStudentPack);
    } catch (error) {
        console.error("Error updating student pack:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour du pack" },
            { status: 500 }
        );
    }
}

// DELETE /api/students/[id]/packs/[packId]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; studentPackId: string }> }
) {
    try {
        const { id, studentPackId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        await prisma.studentPack.delete({
            where: {
                id: studentPackId,
                studentId: id
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting student pack:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression du pack" },
            { status: 500 }
        );
    }
}
