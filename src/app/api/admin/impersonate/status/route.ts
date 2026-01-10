import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { getImpersonationCookie } from "@/lib/impersonation";

// GET /api/admin/impersonate/status - Verifier le statut d'impersonation
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Get current impersonation data
    const impersonationData = await getImpersonationCookie();

    if (!impersonationData) {
      return NextResponse.json({
        isImpersonating: false,
        targetUser: null,
        adminUser: null,
      });
    }

    // Verify the session is valid and belongs to current admin
    if (isAdmin(session.user) && impersonationData.adminId !== session.user.id) {
      return NextResponse.json({
        isImpersonating: false,
        targetUser: null,
        adminUser: null,
      });
    }

    // Get target user details
    const targetUser = await prisma.user.findUnique({
      where: { id: impersonationData.targetId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        image: true,
      },
    });

    // Get admin user details
    const adminUser = await prisma.user.findUnique({
      where: { id: impersonationData.adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({
        isImpersonating: false,
        targetUser: null,
        adminUser: null,
        error: "Utilisateur cible non trouve",
      });
    }

    // Get role-specific info
    let roleInfo = null;
    if (targetUser.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: targetUser.id },
        include: {
          mentor: {
            include: {
              user: {
                select: { firstName: true, lastName: true, name: true },
              },
            },
          },
          packs: {
            include: {
              pack: {
                select: { displayName: true },
              },
            },
          },
        },
      });
      if (student) {
        roleInfo = {
          studentId: student.id,
          status: student.status,
          mentor: student.mentor
            ? {
                id: student.mentor.id,
                name:
                  student.mentor.user.firstName && student.mentor.user.lastName
                    ? `${student.mentor.user.firstName} ${student.mentor.user.lastName}`
                    : student.mentor.user.name,
              }
            : null,
          packs: student.packs.map((p) => p.pack.displayName),
        };
      }
    } else if (targetUser.role === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId: targetUser.id },
        include: {
          _count: { select: { students: true } },
        },
      });
      if (mentor) {
        roleInfo = {
          mentorId: mentor.id,
          studentsCount: mentor._count.students,
        };
      }
    } else if (targetUser.role === "PROFESSOR") {
      const professor = await prisma.professor.findUnique({
        where: { userId: targetUser.id },
        include: {
          _count: { select: { studentsQuant: true, studentsVerbal: true } },
        },
      });
      if (professor) {
        roleInfo = {
          professorId: professor.id,
          type: professor.type,
          studentsCount:
            professor._count.studentsQuant + professor._count.studentsVerbal,
        };
      }
    }

    return NextResponse.json({
      isImpersonating: true,
      sessionId: impersonationData.sessionId,
      expiresAt: impersonationData.exp,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name:
          targetUser.firstName && targetUser.lastName
            ? `${targetUser.firstName} ${targetUser.lastName}`
            : targetUser.name,
        role: targetUser.role,
        image: targetUser.image,
        ...roleInfo,
      },
      adminUser: adminUser
        ? {
            id: adminUser.id,
            email: adminUser.email,
            name:
              adminUser.firstName && adminUser.lastName
                ? `${adminUser.firstName} ${adminUser.lastName}`
                : adminUser.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking impersonation status:", error);
    return NextResponse.json(
      { error: "Erreur lors de la verification du statut" },
      { status: 500 }
    );
  }
}
