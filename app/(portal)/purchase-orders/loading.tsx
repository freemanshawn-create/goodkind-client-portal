import { TablePageSkeleton } from "@/components/layout/table-page-skeleton";

export default function PurchaseOrdersLoading() {
  return <TablePageSkeleton rows={10} columns={7} twoSections />;
}
