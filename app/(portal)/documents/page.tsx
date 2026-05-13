import { getDocumentsAndFolders } from "@/data/repositories/documents";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { mockUsers } from "@/data/mock/users";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const { documents, folders } = await getDocumentsAndFolders({
    driveFolderId: user.driveFolderId,
  });

  const rootFolderId = user.driveFolderId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Access and manage all shared files."
      />

      <DocumentsView
        documents={documents}
        folders={folders}
        rootFolderId={rootFolderId}
        users={mockUsers}
      />
    </div>
  );
}
