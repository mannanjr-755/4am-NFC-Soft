import { prisma } from "@/lib/prisma";

/** Prefix from restaurant slug, e.g. "4am" → "4", "pizza-palace" → "PP". */
function orderPrefix(slug: string): string {
  return (
    slug
      .split("-")
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 3) || "ORD"
  );
}

/**
 * Next order number for a restaurant, e.g. 4-0009.
 * Uses max existing suffix + 1 (not row count) so gaps from deleted orders
 * do not collide with @@unique([restaurantId, orderNumber]).
 */
export async function generateOrderNumber(restaurantId: string, slug: string): Promise<string> {
  const prefix = orderPrefix(slug);
  const existing = await prisma.order.findMany({
    where: {
      restaurantId,
      orderNumber: { startsWith: `${prefix}-` },
    },
    select: { orderNumber: true },
  });

  let max = 0;
  const suffixRe = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);
  for (const row of existing) {
    const match = row.orderNumber.match(suffixRe);
    if (!match) continue;
    const n = Number.parseInt(match[1], 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }

  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}
