import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import { isPlatformAdmin } from "@/lib/auth";
import { getClientDetail } from "@/lib/admin";
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
import { InviteMemberForm } from "@/components/admin/invite-member-form";
import { RemoveMemberButton } from "@/components/admin/remove-member-button";
import { DeleteClient } from "@/components/admin/delete-client";

export const metadata = { title: "Admin · Client" };

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  if (!(await isPlatformAdmin())) redirect("/dashboard");

  const { userId: currentUserId } = await auth();
  const { orgId } = await params;
  const client = await getClientDetail(orgId);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>

      <PageHeader
        title={client.name}
        description={
          client.cardCode
            ? `SAP CardCode ${client.cardCode}`
            : "No SAP CardCode set — this client will show no live data."
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Client details
          </CardTitle>
          <CardDescription>
            Update the name, SAP CardCode, and Drive folder for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            client={{
              id: client.id,
              name: client.name,
              cardCode: client.cardCode,
              brands: client.brands,
              driveFolderId: client.driveFolderId,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Members ({client.members.length})
          </CardTitle>
          <CardDescription>
            Invite people from this client by email. Members see only this
            client&apos;s data; admins can also manage their own team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <InviteMemberForm orgId={client.id} />

          {client.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.role === "org:admin" ? "default" : "secondary"
                        }
                      >
                        {m.role === "org:admin" ? "Admin" : "Member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.userId ? (
                        <RemoveMemberButton
                          orgId={client.id}
                          userId={m.userId}
                          name={m.name}
                          disabled={m.userId === currentUserId}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base font-medium text-destructive">
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete this client and all of its members. This cannot
            be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteClient orgId={client.id} name={client.name} />
        </CardContent>
      </Card>
    </div>
  );
}
