import { getDocuments, getFolders } from "@/data/repositories/documents";
import { mockUsers } from "@/data/mock/users";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const [documents, folders] = await Promise.all([
    getDocuments(),
    getFolders(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Access and manage all shared files."
      />

      <DocumentsView
        documents={documents}
        folders={folders}
        projects={[]}
        users={mockUsers}
      />
    </div>
  );
}
