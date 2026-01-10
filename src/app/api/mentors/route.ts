import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/mentors - List all active mentors
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const mentors = await prisma.mentor.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            active: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedMentors = mentors
      .filter((m) => m.user.active)
      .map((mentor) => ({
        id: mentor.id,
        userId: mentor.userId,
        name:
          mentor.user.name ||
          `${mentor.user.firstName || ""} ${mentor.user.lastName || ""}`.trim(),
        email: mentor.user.email,
        image: mentor.user.image,
        specialties: mentor.specialties,
        paymentType: mentor.paymentType,
      }));

    return NextResponse.json({ mentors: formattedMentors });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des mentors" },
      { status: 500 }
    );
  }
}
