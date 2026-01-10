import { NextRequest, NextResponse } from "next/server";
import { auth, canAccessStudent } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/essays - List essays with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const schoolId = searchParams.get("schoolId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (schoolId) {
      where.schoolId = schoolId;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    // Access control
    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId },
      });
      if (student) {
        where.studentId = student.id;
      }
    } else if (userRole === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
      });
      if (mentor) {
        where.student = {
          mentorId: mentor.id,
        };
      }
    }

    const total = await prisma.essay.count({ where });

    const essays = await prisma.essay.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    const formattedEssays = essays.map((essay) => ({
      id: essay.id,
      title: essay.title,
      content: essay.content.substring(0, 200) + (essay.content.length > 200 ? "..." : ""),
      wordCount: essay.content.split(/\s+/).filter(Boolean).length,
      version: essay.version,
      status: essay.status,
      student: {
        id: essay.student.id,
        name: essay.student.user.name,
        email: essay.student.user.email,
      },
      school: essay.school,
      program: essay.program,
      createdAt: essay.createdAt,
      updatedAt: essay.updatedAt,
    }));

    return NextResponse.json({
      essays: formattedEssays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching essays:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des essays" },
      { status: 500 }
    );
  }
}

// POST /api/essays - Create a new essay
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canAccessStudent(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, studentId, schoolId, programId } = body;

    if (!title || !studentId || !schoolId) {
      return NextResponse.json(
        { error: "Titre, étudiant et école sont requis" },
        { status: 400 }
      );
    }

    // Verify student exists and user has access
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant non trouvé" },
        { status: 404 }
      );
    }

    // Check access for mentors
    if (session.user.role === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId: session.user.id },
      });
      if (mentor && student.mentorId !== mentor.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const essay = await prisma.essay.create({
      data: {
        title,
        content: content || "",
        studentId,
        schoolId,
        programId: programId || null,
        status: "draft",
        createdBy: session.user.id,
        version: 1,
      },
      include: {
        school: true,
        program: true,
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        essay: {
          ...essay,
          wordCount: essay.content.split(/\s+/).filter(Boolean).length,
        },
        message: "Essay créé avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating essay:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'essay" },
      { status: 500 }
    );
  }
}

