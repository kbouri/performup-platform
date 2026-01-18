import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/messages/contacts - Get users the current user can message
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    let contacts: Array<{
      id: string;
      name: string;
      email: string;
      image: string | null;
      role: string | null;
    }> = [];

    if (isAdmin(session.user) || userRole === "EXECUTIVE_CHEF") {
      // Admins and executive chefs can message everyone
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          active: true,
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
        },
        orderBy: [{ role: "asc" }, { firstName: "asc" }],
      });

      contacts = users.map((u) => ({
        id: u.id,
        name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email,
        image: u.image,
        role: u.role,
      }));
    } else if (userRole === "STUDENT") {
      // Students can message their mentor and professors
      const student = await prisma.student.findUnique({
        where: { userId },
        include: {
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
                  role: true,
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
                  role: true,
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
                  role: true,
                },
              },
            },
          },
        },
      });

      if (student) {
        if (student.mentor) {
          contacts.push({
            id: student.mentor.user.id,
            name:
              student.mentor.user.name ||
              `${student.mentor.user.firstName || ""} ${student.mentor.user.lastName || ""}`.trim(),
            email: student.mentor.user.email,
            image: student.mentor.user.image,
            role: "MENTOR",
          });
        }
        if (student.professorQuant) {
          contacts.push({
            id: student.professorQuant.user.id,
            name:
              student.professorQuant.user.name ||
              `${student.professorQuant.user.firstName || ""} ${student.professorQuant.user.lastName || ""}`.trim(),
            email: student.professorQuant.user.email,
            image: student.professorQuant.user.image,
            role: "PROFESSOR",
          });
        }
        if (student.professorVerbal && student.professorVerbal.userId !== student.professorQuant?.userId) {
          contacts.push({
            id: student.professorVerbal.user.id,
            name:
              student.professorVerbal.user.name ||
              `${student.professorVerbal.user.firstName || ""} ${student.professorVerbal.user.lastName || ""}`.trim(),
            email: student.professorVerbal.user.email,
            image: student.professorVerbal.user.image,
            role: "PROFESSOR",
          });
        }
      }

      // Also add admins
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          active: true,
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
        },
      });

      for (const admin of admins) {
        contacts.push({
          id: admin.id,
          name: admin.name || `${admin.firstName || ""} ${admin.lastName || ""}`.trim(),
          email: admin.email,
          image: admin.image,
          role: admin.role,
        });
      }
    } else if (userRole === "MENTOR") {
      // Mentors can message their students and admins
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
        include: {
          students: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
          executiveChef: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (mentor) {
        for (const student of mentor.students) {
          contacts.push({
            id: student.user.id,
            name: student.user.name || `${student.user.firstName || ""} ${student.user.lastName || ""}`.trim(),
            email: student.user.email,
            image: student.user.image,
            role: "STUDENT",
          });
        }

        if (mentor.executiveChef) {
          contacts.push({
            id: mentor.executiveChef.user.id,
            name:
              mentor.executiveChef.user.name ||
              `${mentor.executiveChef.user.firstName || ""} ${mentor.executiveChef.user.lastName || ""}`.trim(),
            email: mentor.executiveChef.user.email,
            image: mentor.executiveChef.user.image,
            role: "EXECUTIVE_CHEF",
          });
        }
      }

      // Add admins
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          active: true,
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
        },
      });

      for (const admin of admins) {
        contacts.push({
          id: admin.id,
          name: admin.name || `${admin.firstName || ""} ${admin.lastName || ""}`.trim(),
          email: admin.email,
          image: admin.image,
          role: admin.role,
        });
      }
    } else if (userRole === "PROFESSOR") {
      // Professors can message their students and admins
      const professor = await prisma.professor.findUnique({
        where: { userId },
        include: {
          studentsQuant: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
          studentsVerbal: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (professor) {
        const studentIds = new Set<string>();

        for (const student of [...(professor.studentsQuant || []), ...(professor.studentsVerbal || [])]) {
          if (!studentIds.has(student.user.id)) {
            studentIds.add(student.user.id);
            contacts.push({
              id: student.user.id,
              name: student.user.name || `${student.user.firstName || ""} ${student.user.lastName || ""}`.trim(),
              email: student.user.email,
              image: student.user.image,
              role: "STUDENT",
            });
          }
        }
      }

      // Add admins
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          active: true,
        },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          image: true,
          role: true,
        },
      });

      for (const admin of admins) {
        contacts.push({
          id: admin.id,
          name: admin.name || `${admin.firstName || ""} ${admin.lastName || ""}`.trim(),
          email: admin.email,
          image: admin.image,
          role: admin.role,
        });
      }
    }

    // Remove duplicates
    const uniqueContacts = contacts.filter(
      (contact, index, self) => index === self.findIndex((c) => c.id === contact.id)
    );

    return NextResponse.json({ contacts: uniqueContacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des contacts" },
      { status: 500 }
    );
  }
}
