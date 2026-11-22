import { CustomerShell } from "../../../components/customer-shell";
import { isTableId } from "../../../lib/catalog";

export default async function TableLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  if (!isTableId(tableId)) return children;

  return <CustomerShell tableId={tableId}>{children}</CustomerShell>;
}
