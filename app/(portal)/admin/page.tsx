import Link from "next/link";
import { redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth";
import { listClients } from "@/lib/admin";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientForm } from "@/components/admin/client-form";

export const metadata = { title: "Admin · Clients" };

export default async function AdminPage() {
  // Platform super-admins only.
  if (!(await isPlatformAdmin())) redirect("/dashboard");

  const clients = await listClients();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Administration"
        description="Create and manage client accounts, their SAP CardCode, and members."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Add a client</CardTitle>
          <CardDescription>
            Creates a Clerk organization with its SAP CardCode. You become its
            first admin, so it appears in your org switcher for viewing data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Clients ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No clients yet. Add one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>CardCode</TableHead>
                  <TableHead>Brands</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/${c.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.cardCode ? (
                        <span className="font-mono text-sm">{c.cardCode}</span>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.brands?.length ? c.brands.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.membersCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
