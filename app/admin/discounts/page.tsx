import { repo } from "@/lib/data";
import { DiscountsManager } from "@/components/admin/discounts-manager";

export const metadata = { title: "Discounts" };

export default async function AdminDiscountsPage() {
  const discounts = await repo.getDiscounts();
  return <DiscountsManager discounts={discounts} />;
}
