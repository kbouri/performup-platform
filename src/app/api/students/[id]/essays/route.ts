import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/students/[id]/essays - Create an essay
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
        const { title, content, schoolId, programId } = body;

        const essay = await prisma.essay.create({
            data: {
                studentId: id,
                title,
                content: content || "",
                schoolId,
                programId,
                status: "draft",
                createdBy: session.user.id
            },
            include: {
                school: true,
                program: true
            }
        });

        return NextResponse.json(essay, { status: 201 });
    } catch (error) {
        console.error("Error creating essay:", error);
        return NextResponse.json(
            { error: "Erreur lors de la création de l'essay" },
            { status: 500 }
        );
    }
}
