import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/tests/simulations - Create an oral simulation
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const body = await request.json();

    const { studentId, schoolId, title, date, score, notes, videoUrl, completed } = body;

    // Validate required fields
    if (!title || !date) {
      return NextResponse.json(
        { error: "Titre et date sont requis" },
        { status: 400 }
      );
    }

    // Determine target student
    let targetStudentId: string;

    if (userRole === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Profil étudiant non trouvé" }, { status: 404 });
      }
      targetStudentId = student.id;
    } else {
      if (!studentId) {
        return NextResponse.json({ error: "ID étudiant requis" }, { status: 400 });
      }
      targetStudentId = studentId;
    }

    // Create simulation
    const simulation = await prisma.oralSimulation.create({
      data: {
        studentId: targetStudentId,
        schoolId: schoolId || null,
        title,
        date: new Date(date),
        score: score ? parseInt(score) : null,
        notes: notes || null,
        videoUrl: videoUrl || null,
        completed: completed || false,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ simulation }, { status: 201 });
  } catch (error) {
    console.error("Error creating simulation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la simulation" },
      { status: 500 }
    );
  }
}
