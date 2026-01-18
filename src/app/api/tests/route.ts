import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/tests - Get test scores for current student
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");

    // Determine which student to fetch scores for
    let targetStudentId: string | null = null;

    if (userRole === "STUDENT") {
      // Students can only see their own scores
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { id: true },
      });
      targetStudentId = student?.id || null;
    } else if (studentId) {
      // Staff can view any student's scores
      targetStudentId = studentId;
    }

    if (!targetStudentId) {
      return NextResponse.json({ scores: [], testsBlancs: [], simulations: [] });
    }

    // Get test scores
    const scores = await prisma.testScore.findMany({
      where: { studentId: targetStudentId },
      orderBy: { testDate: "desc" },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get tests blancs (calendar events of type TEST_BLANC)
    const testsBlancs = await prisma.calendarEvent.findMany({
      where: {
        studentId: targetStudentId,
        eventType: "TEST_BLANC",
      },
      orderBy: { startTime: "desc" },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        completed: true,
        notes: true,
        instructor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Get oral simulations
    const simulations = await prisma.oralSimulation.findMany({
      where: { studentId: targetStudentId },
      orderBy: { date: "desc" },
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

    // Format responses
    const formattedScores = scores.map((score) => ({
      id: score.id,
      testType: score.testType,
      scoreType: score.scoreType,
      scoreQuant: score.scoreQuant,
      scoreVerbal: score.scoreVerbal,
      scoreAWA: score.scoreAWA,
      scoreIR: score.scoreIR,
      totalScore: score.totalScore,
      scoreString: score.scoreString,
      testDate: score.testDate,
      validUntil: score.validUntil,
      notes: score.notes,
      document: score.document,
      createdBy: score.createdByUser
        ? {
            id: score.createdByUser.id,
            name:
              score.createdByUser.name ||
              `${score.createdByUser.firstName || ""} ${score.createdByUser.lastName || ""}`.trim(),
          }
        : null,
      createdAt: score.createdAt,
    }));

    const formattedTestsBlancs = testsBlancs.map((test) => ({
      id: test.id,
      title: test.title,
      startTime: test.startTime,
      endTime: test.endTime,
      completed: test.completed,
      notes: test.notes,
      instructor: test.instructor
        ? {
            id: test.instructor.id,
            name:
              test.instructor.user.name ||
              `${test.instructor.user.firstName || ""} ${test.instructor.user.lastName || ""}`.trim(),
          }
        : null,
    }));

    const formattedSimulations = simulations.map((sim) => ({
      id: sim.id,
      title: sim.title,
      school: sim.school
        ? {
            id: sim.school.id,
            name: sim.school.name,
            logoUrl: sim.school.logoUrl,
          }
        : null,
      date: sim.date,
      score: sim.score,
      notes: sim.notes,
      videoUrl: sim.videoUrl,
      completed: sim.completed,
      createdAt: sim.createdAt,
    }));

    return NextResponse.json({
      scores: formattedScores,
      testsBlancs: formattedTestsBlancs,
      simulations: formattedSimulations,
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tests" },
      { status: 500 }
    );
  }
}

// POST /api/tests - Add a new test score
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

    const {
      studentId,
      testType,
      scoreType,
      scoreQuant,
      scoreVerbal,
      scoreAWA,
      scoreIR,
      totalScore,
      scoreString,
      testDate,
      validUntil,
      notes,
      documentId,
    } = body;

    // Validate required fields
    if (!testType || !scoreType || !testDate) {
      return NextResponse.json(
        { error: "Type de test, type de score et date sont requis" },
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

    // Create test score
    const score = await prisma.testScore.create({
      data: {
        studentId: targetStudentId,
        testType,
        scoreType,
        scoreQuant: scoreQuant ? parseInt(scoreQuant) : null,
        scoreVerbal: scoreVerbal ? parseInt(scoreVerbal) : null,
        scoreAWA: scoreAWA ? parseFloat(scoreAWA) : null,
        scoreIR: scoreIR ? parseInt(scoreIR) : null,
        totalScore: totalScore ? parseInt(totalScore) : null,
        scoreString: scoreString || null,
        testDate: new Date(testDate),
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        documentId: documentId || null,
        createdBy: userId,
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ score }, { status: 201 });
  } catch (error) {
    console.error("Error creating test score:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du score" },
      { status: 500 }
    );
  }
}
