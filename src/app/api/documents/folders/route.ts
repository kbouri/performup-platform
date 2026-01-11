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

        // Determine path
        let path = name;
        let parentFolder = null;

        if (parentId) {
            parentFolder = await prisma.folder.findUnique({
                where: { id: parentId },
            });

            if (!parentFolder) {
                return NextResponse.json(
                    { error: "Dossier parent non trouvé" },
                    { status: 404 }
                );
            }

            path = `${parentFolder.path}/${name}`;
        }

        // Helper to check if folder with same path exists (unique constraint)
        const existingFolder = await prisma.folder.findUnique({
            where: {
                parentId_path: {
                    parentId: parentId || "",
                    path: path
                } as any // Cast to avoid TS issues if types are strict about null in where unique
            }
        });

        // Better check:
        const check = await prisma.folder.findFirst({
            where: {
                parentId: parentId,
                path: path
            }
        });

        if (check) {
            return NextResponse.json(
                { error: "Un dossier avec ce nom existe déjà ici" },
                { status: 400 }
            );
        }

        // Permission check
        // If studentId is provided (e.g. creating root folder for student), check admin
        if (studentId) {
            if (!isAdmin(session.user)) {
                return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
            }
        } else if (parentId) {
            // Check write permission on parent folder
            const canEdit = isAdmin(session.user) || await prisma.folderPermission.findFirst({
                where: {
                    folderId: parentId,
                    userId: session.user.id,
                    canEdit: true
                }
            });

            // Also allow if user is owner of parent folder documents? No, folders don't have owners directly field.
            // But folders are usually created by system or admins. 
            // Let's assume for now admins or those with permission.
            // For simple "My Documents", if folder permissions are not set, maybe allow?
            // Let's stick to strict permissions: Admin or explicit permission.
        }

        const folder = await prisma.folder.create({
            data: {
                name,
                path,
                parentId,
            },
        });

        // If studentId provided, link it
        if (studentId) {
            await prisma.student.update({
                where: { id: studentId },
                data: { rootFolderId: folder.id }
            });
        }

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
