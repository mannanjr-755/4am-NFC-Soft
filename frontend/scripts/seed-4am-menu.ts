/**
 * Wipe old menu categories/items and seed the official 4AM Cafe menu
 * from 4AM_Cafe_Menu.pdf into the connected DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MENU: { name: string; items: { name: string; price: number }[] }[] = [
  {
    name: "Ice Tea",
    items: [
      { name: "Peach Ice Tea", price: 540 },
      { name: "Passion Fruit Ice Tea", price: 450 },
    ],
  },
  {
    name: "Hot Coffees",
    items: [
      { name: "Hot Espresso", price: 480 },
      { name: "Hot Americano", price: 490 },
      { name: "Hot Cappuccino", price: 580 },
      { name: "Hot Latte", price: 580 },
      { name: "Hot Cortado", price: 540 },
      { name: "Hot Vanilla", price: 650 },
      { name: "Hot Caramel", price: 650 },
      { name: "Hot Hazelnut", price: 650 },
      { name: "Hot Spanish", price: 440 },
      { name: "Hot Mocha", price: 730 },
      { name: "Hot Chocolate", price: 670 },
      { name: "Hot Pistachio", price: 650 },
    ],
  },
  {
    name: "Mojitos",
    items: [
      { name: "Mango Mojito", price: 590 },
      { name: "Strawberry Mojito", price: 550 },
      { name: "Passion Fruit Mojito", price: 540 },
    ],
  },
  {
    name: "Chillers",
    items: [
      { name: "Mango Chiller", price: 900 },
      { name: "Strawberry Chiller", price: 860 },
    ],
  },
  {
    name: "Frappe",
    items: [
      { name: "4Am Signature Frappe", price: 700 },
      { name: "Pistachio Frappe", price: 840 },
      { name: "Lotus Frappe", price: 900 },
      { name: "Kinder Frappe", price: 710 },
      { name: "Hazelnut Frappe", price: 720 },
      { name: "Caramel Frappe", price: 720 },
      { name: "Vanilla Frappe", price: 720 },
      { name: "Mocha Frappe", price: 700 },
    ],
  },
  {
    name: "Ice Coffees",
    items: [
      { name: "Plain Ice Latte", price: 550 },
      { name: "Ice 4:AM Signature Latte", price: 640 },
      { name: "Ice Tiramisu Latte", price: 650 },
      { name: "Pistachio Latte", price: 780 },
      { name: "Kinder Latte", price: 650 },
      { name: "Vanilla Latte", price: 660 },
      { name: "Caramel Latte", price: 660 },
      { name: "Hazelnut Latte", price: 660 },
      { name: "Ice Spanish Latte", price: 580 },
      { name: "Ice Mocha Latte", price: 710 },
    ],
  },
];

async function main() {
  console.log("Connecting and syncing 4AM Cafe menu...");

  let restaurant = await prisma.restaurant.findUnique({ where: { slug: "4am" } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: "4AM Coffee & More",
        slug: "4am",
        description: "Coffee & more — ice tea, hot coffees, mojitos, chillers, frappe, ice coffees.",
        phone: "+92 300 1234567",
        whatsapp: "+923001234567",
        address: "4AM Cafe",
        openingHours: JSON.stringify({
          mon: "11:00–23:00",
          tue: "11:00–23:00",
          wed: "11:00–23:00",
          thu: "11:00–23:00",
          fri: "11:00–00:00",
          sat: "11:00–00:00",
          sun: "12:00–22:00",
        }),
      },
    });
    console.log("Created restaurant:", restaurant.slug);
  } else {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { name: "4AM Coffee & More" },
    });
    console.log("Using restaurant:", restaurant.slug);
  }

  const passwordHash = await bcrypt.hash("123", 10);
  await prisma.user.upsert({
    where: { email: "admin@4am.com" },
    update: {
      passwordHash,
      active: true,
      role: "ADMIN",
      name: "Admin",
      restaurantId: restaurant.id,
    },
    create: {
      email: "admin@4am.com",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
      restaurantId: restaurant.id,
    },
  });

  const tableCount = await prisma.table.count({ where: { restaurantId: restaurant.id } });
  if (tableCount === 0) {
    for (let n = 1; n <= 12; n++) {
      await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber: n,
          uniqueCode: `4am-t${n}-${Math.random().toString(36).slice(2, 8)}`,
          active: true,
        },
      });
    }
    console.log("Created 12 tables");
  }

  // Detach order lines from menu items, then wipe categories/items.
  await prisma.orderItem.updateMany({ data: { menuItemId: null } });
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await prisma.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });
  console.log("Deleted old menu for restaurant");

  let itemCount = 0;
  for (let i = 0; i < MENU.length; i++) {
    const cat = MENU[i];
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: cat.name,
        sortOrder: i,
      },
    });
    const created = await prisma.menuItem.createMany({
      data: cat.items.map((item) => ({
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: item.name,
        price: item.price,
        available: true,
      })),
    });
    itemCount += created.count;
  }

  console.log(`Seeded ${MENU.length} categories, ${itemCount} items`);
  console.log("Admin login: admin@4am.com / 123");
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.warn(`[retry ${i}/${attempts}] ${label}:`, (err as Error)?.message ?? err);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

withRetry("seed-4am-menu", main)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
