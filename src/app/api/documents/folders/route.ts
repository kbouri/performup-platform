import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin, canAccessStudent } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/documents/folders - Create a new folder
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const body = await request.json();
        const { name, parentId, studentId } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Le nom du dossier est requis" },
                { status: 400 }
            );
        }

        // Determine the actual parent folder
        let actualParentId = parentId;

        // If studentId is provided and no parentId, use or create student's root folder as parent
        if (studentId && !parentId) {
            const student = await prisma.student.findUnique({
                where: { id: studentId },
                include: { user: { select: { name: true } } }
            });

            if (student) {
                if (student.rootFolderId) {
                    actualParentId = student.rootFolderId;
                } else {
                    // Create root folder for student first
                    const studentName = student.user.name || `Étudiant ${studentId.slice(0, 8)}`;
                    const rootFolder = await prisma.folder.create({
                        data: {
                            name: `Documents - ${studentName}`,
                            path: `/students/${studentId}`,
                        }
                    });
                    await prisma.student.update({
                        where: { id: studentId },
                        data: { rootFolderId: rootFolder.id }
                    });
                    actualParentId = rootFolder.id;
                }
            }
        }

        // Determine path
        let path = name;
        let parentFolder = null;

        if (actualParentId) {
            parentFolder = await prisma.folder.findUnique({
                where: { id: actualParentId },
            });

            if (!parentFolder) {
                return NextResponse.json(
                    { error: "Dossier parent non trouvé" },
                    { status: 404 }
                );
            }

            path = `${parentFolder.path}/${name}`;
        }

        // Check if folder with same path exists
        const check = await prisma.folder.findFirst({
            where: {
                parentId: actualParentId,
                path: path
            }
        });

        if (check) {
            return NextResponse.json(
                { error: "Un dossier avec ce nom existe déjà ici" },
                { status: 400 }
            );
        }

        // Permission check - admins can always create, others need permission on parent
        if (!isAdmin(session.user) && actualParentId) {
            const hasPermission = await prisma.folderPermission.findFirst({
                where: {
                    folderId: actualParentId,
                    userId: session.user.id,
                    canEdit: true
                }
            });

            if (!hasPermission) {
                return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
            }
        }

        const folder = await prisma.folder.create({
            data: {
                name,
                path,
                parentId: actualParentId,
            },
        });

        // Grant creator full permissions (if not admin, though admins have implied)
        if (!isAdmin(session.user)) {
            await prisma.folderPermission.create({
                data: {
                    folderId: folder.id,
                    userId: session.user.id,
                    canView: true,
                    canUpload: true,
                    canEdit: true,
                    canDelete: true,
                    createdBy: session.user.id
                }
            });
        }

        return NextResponse.json({ folder }, { status: 201 });

    } catch (error) {
        console.error("Error creating folder:", error);
        return NextResponse.json(
            { error: "Erreur lors de la création du dossier" },
            { status: 500 }
        );
    }
}

// GET /api/documents/folders - List folders (usually via parentId)
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const parentId = searchParams.get("parentId");
        const studentId = searchParams.get("studentId");

        let targetParentId = parentId;

        // If studentId provided, get root folder of student
        if (studentId) {
            // Check access
            if (!canAccessStudent(session.user)) { // Need to verify specific student access
                // Simplified check, normally would check against student ID
            }

            const student = await prisma.student.findUnique({
                where: { id: studentId },
                select: { rootFolderId: true }
            });

            if (student?.rootFolderId) {
                targetParentId = student.rootFolderId;
            }
        }

        const where: any = {
            parentId: targetParentId || null
        };

        // Filter by permissions if not admin
        if (!isAdmin(session.user)) {
            where.permissions = {
                some: {
                    userId: session.user.id,
                    canView: true
                }
            };
            // OR public folders? Implementation dependent.
            // Also need to allow if user is owner of student profile linked to this folder?
            // Folder permissions should be propagated.
        }

        const folders = await prisma.folder.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { documents: true }
                }
            }
        });

        return NextResponse.json({ folders });

    } catch (error) {
        console.error("Error fetching folders:", error);
        return NextResponse.json(
            { error: "Erreur lors de la récupération des dossiers" },
            { status: 500 }
        );
    }
}
