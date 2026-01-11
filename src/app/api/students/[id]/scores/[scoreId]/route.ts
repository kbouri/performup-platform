import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/students/[id]/scores/[scoreId] - Update a score
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; scoreId: string }> }
) {
    try {
        const { id, scoreId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const body = await request.json();
        const {
            testType,
            scoreType,
            scoreQuant,
            scoreVerbal,
            scoreAWA,
            scoreIR,
            totalScore,
            testDate,
            notes
        } = body;

        const updatedScore = await prisma.testScore.update({
            where: { id: scoreId },
            data: {
                testType,
                scoreType,
                scoreQuant,
                scoreVerbal,
                scoreAWA,
                scoreIR,
                totalScore,
                testDate: testDate ? new Date(testDate) : undefined,
                notes,
            },
        });

        return NextResponse.json(updatedScore);
    } catch (error) {
        console.error("Error updating score:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour du score" },
            { status: 500 }
        );
    }
}

// DELETE /api/students/[id]/scores/[scoreId] - Delete a score
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; scoreId: string }> }
) {
    try {
        const { scoreId } = await params;
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user || !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        await prisma.testScore.delete({
            where: { id: scoreId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting score:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression du score" },
            { status: 500 }
        );
    }
}
