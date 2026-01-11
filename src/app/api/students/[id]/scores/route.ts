import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/students/[id]/scores - List scores for a student
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

        const student = await prisma.student.findUnique({
            where: { id },
            select: { userId: true }
        });

        if (!student) {
            return NextResponse.json({ error: "Étudiant non trouvé" }, { status: 404 });
        }

        if (student.userId !== session.user.id && !canManageStudents(session.user)) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const scores = await prisma.testScore.findMany({
            where: { studentId: id },
            orderBy: { testDate: "desc" },
        });

        return NextResponse.json(scores);
    } catch (error) {
        console.error("Error fetching scores:", error);
        return NextResponse.json(
            { error: "Erreur lors de la récupération des scores" },
            { status: 500 }
        );
    }
}

// POST /api/students/[id]/scores - Add a new score
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

        if (!testType || !scoreType || !testDate) {
            return NextResponse.json(
                { error: "Champs obligatoires manquants" },
                { status: 400 }
            );
        }

        const newScore = await prisma.testScore.create({
            data: {
                studentId: id,
                testType,
                scoreType,
                scoreQuant,
                scoreVerbal,
                scoreAWA,
                scoreIR,
                totalScore,
                testDate: new Date(testDate),
                notes,
                createdBy: session.user.id
            },
        });

        return NextResponse.json(newScore, { status: 201 });
    } catch (error) {
        console.error("Error creating score:", error);
        return NextResponse.json(
            { error: "Erreur lors de la création du score" },
            { status: 500 }
        );
    }
}
