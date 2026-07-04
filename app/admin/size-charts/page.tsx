import { repo } from "@/lib/data";
import { SizeChartsManager } from "@/components/admin/size-charts-manager";

export const metadata = { title: "Size charts" };

export default async function AdminSizeChartsPage() {
  const charts = await repo.getSizeCharts();
  return <SizeChartsManager charts={charts} />;
}
