import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/students/[id] - Get a single student with full details
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

    // Get the student
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            image: true,
            active: true,
            createdAt: true,
          },
        },
        mentor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
          },
        },
        professorQuant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
          },
        },
        professorVerbal: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
          },
        },
        packs: {
          include: {
            pack: true,
          },
        },
        schools: {
          include: {
            school: true,
            program: true,
          },
          orderBy: { priority: "asc" },
        },
        schoolApplications: {
          include: {
            school: true,
            program: true,
          },
        },
        calendarEvents: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          orderBy: { startTime: "asc" },
          take: 10,
          include: {
            instructor: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        tasks: {
          where: {
            completed: false,
          },
          orderBy: { dueDate: "asc" },
          take: 10,
        },
        essays: {
          include: {
            school: true,
            program: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        testScores: {
          orderBy: { testDate: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 10,
        },
        paymentSchedules: {
          orderBy: { dueDate: "asc" },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        academicExperiences: {
          orderBy: { startDate: "desc" },
        },
        workExperiences: {
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant non trouvé" },
        { status: 404 }
      );
    }

    // Check access permissions
    const userId = session.user.id;
    const userRole = session.user.role;

    // Students can only access their own profile
    if (userRole === "STUDENT" && student.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Mentors can only access their students
    if (userRole === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
      });
      if (mentor && student.mentorId !== mentor.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    // Professors can only access their students
    if (userRole === "PROFESSOR") {
      const professor = await prisma.professor.findUnique({
        where: { userId },
      });
      if (
        professor &&
        student.professorQuantId !== professor.id &&
        student.professorVerbalId !== professor.id
      ) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    // Calculate computed fields
    const totalPaid = student.payments
      .filter((p) => p.status === "VALIDATED")
      .reduce((acc, p) => acc + p.amount, 0);

    const totalDue = student.paymentSchedules.reduce(
      (acc, ps) => acc + ps.amount,
      0
    );

    const averageProgress =
      student.packs.length > 0
        ? Math.round(
            student.packs.reduce((acc, p) => acc + p.progressPercent, 0) /
              student.packs.length
          )
        : 0;

    // Format response
    const response = {
      ...student,
      totalPaid,
      totalDue,
      progress: averageProgress,
      team: {
        mentor: student.mentor
          ? {
              id: student.mentor.id,
              userId: student.mentor.userId,
              name: student.mentor.user.name,
              email: student.mentor.user.email,
              image: student.mentor.user.image,
            }
          : null,
        professorQuant: student.professorQuant
          ? {
              id: student.professorQuant.id,
              userId: student.professorQuant.userId,
              name: student.professorQuant.user.name,
              email: student.professorQuant.user.email,
              image: student.professorQuant.user.image,
              type: student.professorQuant.type,
            }
          : null,
        professorVerbal: student.professorVerbal
          ? {
              id: student.professorVerbal.id,
              userId: student.professorVerbal.userId,
              name: student.professorVerbal.user.name,
              email: student.professorVerbal.user.email,
              image: student.professorVerbal.user.image,
              type: student.professorVerbal.type,
            }
          : null,
      },
    };

    return NextResponse.json({ student: response });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'étudiant" },
      { status: 500 }
    );
  }
}

// PATCH /api/students/[id] - Update a student
export async function PATCH(
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

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: "Étudiant non trouvé" },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = session.user.role;
    const userId = session.user.id;

    // Students can only update limited fields of their own profile
    if (userRole === "STUDENT" && existingStudent.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Mentors can only update their students
    if (userRole === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
      });
      if (mentor && existingStudent.mentorId !== mentor.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      personalInfo,
      team,
      status,
      internalNotes,
      packs,
      schools,
    } = body;

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user info if provided
      if (personalInfo) {
        await tx.user.update({
          where: { id: existingStudent.userId },
          data: {
            name:
              personalInfo.firstName && personalInfo.lastName
                ? `${personalInfo.firstName} ${personalInfo.lastName}`
                : undefined,
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName,
            phone: personalInfo.phone,
            image: personalInfo.image,
          },
        });
      }

      // Prepare student update data
      const studentUpdateData: Record<string, unknown> = {};

      if (personalInfo) {
        if (personalInfo.dateOfBirth !== undefined) {
          studentUpdateData.dateOfBirth = personalInfo.dateOfBirth
            ? new Date(personalInfo.dateOfBirth)
            : null;
        }
        if (personalInfo.nationality !== undefined) {
          studentUpdateData.nationality = personalInfo.nationality;
        }
        if (personalInfo.currentFormation !== undefined) {
          studentUpdateData.currentFormation = personalInfo.currentFormation;
        }
        if (personalInfo.linkedinUrl !== undefined) {
          studentUpdateData.linkedinUrl = personalInfo.linkedinUrl;
        }
        if (personalInfo.programType !== undefined) {
          studentUpdateData.programType = personalInfo.programType;
        }
      }

      // Team updates (admin/mentor only)
      if (team && canManageStudents(session.user)) {
        if (team.mentorId !== undefined) {
          studentUpdateData.mentorId = team.mentorId || null;
        }
        if (team.professorQuantId !== undefined) {
          studentUpdateData.professorQuantId = team.professorQuantId || null;
        }
        if (team.professorVerbalId !== undefined) {
          studentUpdateData.professorVerbalId = team.professorVerbalId || null;
        }
      }

      // Status update (admin/mentor only)
      if (status && canManageStudents(session.user)) {
        studentUpdateData.status = status;
      }

      // Internal notes (admin/mentor only)
      if (internalNotes !== undefined && canManageStudents(session.user)) {
        studentUpdateData.internalNotes = internalNotes;
      }

      // Update student
      const updatedStudent = await tx.student.update({
        where: { id },
        data: studentUpdateData,
      });

      // Update packs if provided (admin/mentor only)
      if (packs && Array.isArray(packs) && canManageStudents(session.user)) {
        for (const packData of packs) {
          if (packData.id) {
            // Update existing pack
            await tx.studentPack.update({
              where: { id: packData.id },
              data: {
                customPrice: packData.customPrice,
                progressPercent: packData.progressPercent,
                status: packData.status,
                config: packData.config,
                notes: packData.notes,
              },
            });
          } else if (packData.packId && packData.selected) {
            // Create new pack
            await tx.studentPack.create({
              data: {
                studentId: id,
                packId: packData.packId,
                customPrice: packData.customPrice || 0,
                config: packData.config || {},
                status: "active",
                startDate: new Date(),
              },
            });
          }
        }
      }

      // Update schools if provided (admin/mentor only)
      if (schools && Array.isArray(schools) && canManageStudents(session.user)) {
        for (const schoolData of schools) {
          if (schoolData.id) {
            // Update existing school
            await tx.studentSchool.update({
              where: { id: schoolData.id },
              data: {
                priority: schoolData.priority,
                status: schoolData.status,
                notes: schoolData.notes,
              },
            });
          } else if (schoolData.schoolId) {
            // Create new school
            await tx.studentSchool.create({
              data: {
                studentId: id,
                schoolId: schoolData.schoolId,
                programId: schoolData.programId,
                priority: schoolData.priority || 1,
                status: "TARGET",
              },
            });
          }
        }
      }

      return updatedStudent;
    });

    // Fetch updated student with all relations
    const updatedStudent = await prisma.student.findUnique({
      where: { id: result.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            image: true,
            active: true,
          },
        },
        mentor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        packs: {
          include: {
            pack: true,
          },
        },
        schools: {
          include: {
            school: true,
            program: true,
          },
        },
      },
    });

    return NextResponse.json({
      student: updatedStudent,
      message: "Étudiant mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating student:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'étudiant" },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id] - Deactivate a student
export async function DELETE(
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

    // Only admin can delete students
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant non trouvé" },
        { status: 404 }
      );
    }

    // Soft delete - deactivate instead of hard delete
    await prisma.user.update({
      where: { id: student.userId },
      data: { active: false },
    });

    await prisma.student.update({
      where: { id },
      data: { status: "SUSPENDU" },
    });

    return NextResponse.json({
      message: "Étudiant désactivé avec succès",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'étudiant" },
      { status: 500 }
    );
  }
}
