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
        const { schoolId, programId, priority, status, createEssayTasks } = body;

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
                program: {
                    include: {
                        essayQuestions: {
                            where: { active: true },
                            orderBy: [{ round: "asc" }, { order: "asc" }]
                        }
                    }
                }
            }
        });

        // Auto-create essay entries and tasks for each essay question
        if (createEssayTasks !== false && application.program?.essayQuestions?.length > 0) {
            const student = await prisma.student.findUnique({
                where: { id },
                select: { id: true, mentorId: true }
            });

            for (const essayQuestion of application.program.essayQuestions) {
                // Create the essay entry
                const essay = await prisma.essay.create({
                    data: {
                        studentId: id,
                        programId: application.programId,
                        essayQuestionId: essayQuestion.id,
                        title: `${application.school.name} - ${essayQuestion.question.substring(0, 50)}...`,
                        content: "",
                        status: "not_started",
                        wordCount: 0
                    }
                });

                // Create a task for writing the essay
                await prisma.task.create({
                    data: {
                        studentId: id,
                        title: `Rédiger essay: ${application.school.name} - ${essayQuestion.round}`,
                        description: `Question: ${essayQuestion.question}${essayQuestion.wordLimit ? `\n\nLimite: ${essayQuestion.wordLimit} mots` : ""}${essayQuestion.questionTips ? `\n\nConseils: ${essayQuestion.questionTips}` : ""}`,
                        type: "essay",
                        status: "todo",
                        priority: "high",
                        createdBy: session.user.id,
                        essayId: essay.id
                    }
                });

                // If student has a mentor, also create a review task for the mentor
                if (student?.mentorId) {
                    await prisma.task.create({
                        data: {
                            studentId: id,
                            title: `Relire essay: ${application.school.name} - ${essayQuestion.round}`,
                            description: `Relecture de l'essay pour ${application.school.name}.\n\nQuestion: ${essayQuestion.question}`,
                            type: "essay_review",
                            status: "todo",
                            priority: "medium",
                            createdBy: session.user.id,
                            essayId: essay.id
                        }
                    });
                }
            }
        }

        return NextResponse.json({
            ...application,
            essaysCreated: application.program?.essayQuestions?.length || 0
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating application:", error);
        return NextResponse.json(
            { error: "Erreur lors de l'ajout de l'école" },
            { status: 500 }
        );
    }
}
