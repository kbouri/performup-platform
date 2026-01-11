import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/students/[id]/packs - List user packs
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // ... basic list logic if needed, but usually fetched with student
    return NextResponse.json({ message: "Use main student endpoint" }, { status: 501 });
}

// POST /api/students/[id]/packs - Add a pack to student
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
        const { packId, customPrice, startDate, status } = body;

        if (!packId || customPrice === undefined) {
            return NextResponse.json(
                { error: "Pack et prix personnalisés sont requis" },
                { status: 400 }
            );
        }

        // Check if valid pack
        const pack = await prisma.pack.findUnique({ where: { id: packId } });
        if (!pack) {
            return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
        }

        const newStudentPack = await prisma.studentPack.create({
            data: {
                studentId: id,
                packId,
                customPrice,
                status: status || "active",
                startDate: startDate ? new Date(startDate) : new Date(),
                progressPercent: 0
            },
            include: {
                pack: true
            }
        });

        return NextResponse.json(newStudentPack, { status: 201 });
    } catch (error) {
        console.error("Error creating student pack:", error);
        // Check for unique constraint violation
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ error: "L'étudiant a déjà ce pack" }, { status: 409 });
        }
        return NextResponse.json(
            { error: "Erreur lors de l'ajout du pack" },
            { status: 500 }
        );
    }
}
