import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/students/[id]/schools - Add a school application
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
        const { schoolId, programId, priority, status } = body;

        // Check availability
        const existing = await prisma.studentSchoolApplication.findUnique({
            where: {
                studentId_programId: {
                    studentId: id,
                    programId
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Cette candidature existe déjà" }, { status: 409 });
        }

        const application = await prisma.studentSchoolApplication.create({
            data: {
                studentId: id,
                schoolId,
                programId,
                priority: priority || 1,
                status: status || "interested"
            },
            include: {
                school: true,
                program: true
            }
        });

        return NextResponse.json(application, { status: 201 });
    } catch (error) {
        console.error("Error creating application:", error);
        return NextResponse.json(
            { error: "Erreur lors de l'ajout de l'école" },
            { status: 500 }
        );
    }
}
