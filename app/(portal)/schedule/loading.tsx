import { TablePageSkeleton } from "@/components/layout/table-page-skeleton";

export default function ScheduleLoading() {
  return <TablePageSkeleton rows={10} columns={9} twoSections />;
}
