import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/documents/folders/[id] - Rename or Move folder
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

        const folder = await prisma.folder.findUnique({
            where: { id },
            include: {
                permissions: {
                    where: { userId: session.user.id },
                },
            },
        });

        if (!folder) {
            return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
        }

        // Check permission
        const canEdit =
            isAdmin(session.user) ||
            folder.permissions.some((p) => p.canEdit);

        if (!canEdit) {
            return NextResponse.json(
                { error: "Vous n'avez pas la permission de modifier ce dossier" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, parentId } = body;

        const data: any = {};
        if (name) data.name = name;
        if (parentId !== undefined) {
            // Look up parent folder to update path
            if (parentId === null) {
                data.parentId = null;
                data.path = name || folder.name;
            } else {
                const parent = await prisma.folder.findUnique({ where: { id: parentId } });
                if (!parent) return NextResponse.json({ error: "Dossier parent non trouvé" }, { status: 404 });
                data.parentId = parentId;
                data.path = `${parent.path}/${name || folder.name}`;
            }
        } else if (name) {
            // Just rename, update path based on current parent
            if (folder.parentId) {
                const parent = await prisma.folder.findUnique({ where: { id: folder.parentId } });
                if (parent) data.path = `${parent.path}/${name}`;
            } else {
                data.path = name;
            }
        }

        const updated = await prisma.folder.update({
            where: { id },
            data,
        });

        return NextResponse.json({ folder: updated });
    } catch (error) {
        console.error("Error updating folder:", error);
        return NextResponse.json(
            { error: "Erreur lors de la mise à jour du dossier" },
            { status: 500 }
        );
    }
}

// DELETE /api/documents/folders/[id]
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

        const folder = await prisma.folder.findUnique({
            where: { id },
        });

        if (!folder) {
            return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
        }

        // Check permission - Only Admin or Creator (implied via permissions?)
        // Realistically only Admin should delete structure, or owner of workspace.
        if (!isAdmin(session.user)) {
            return NextResponse.json(
                { error: "Seul un administrateur peut supprimer des dossiers" },
                { status: 403 }
            );
        }

        // Check if empty? Or recursive delete?
        // Recursive delete is dangerous. Let's enforce empty.
        const hasChildren = await prisma.folder.count({ where: { parentId: id } });
        const hasDocs = await prisma.document.count({ where: { folderId: id } });

        if (hasChildren > 0 || hasDocs > 0) {
            return NextResponse.json(
                { error: "Le dossier n'est pas vide" },
                { status: 400 }
            );
        }

        await prisma.folder.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting folder:", error);
        return NextResponse.json(
            { error: "Erreur lors de la suppression du dossier" },
            { status: 500 }
        );
    }
}
