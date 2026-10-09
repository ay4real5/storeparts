// Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
// With --demo, also adds a few sample products so the storefront isn't empty.
//   npm run db:seed            (admin only)
//   npm run db:seed -- --demo  (admin + demo catalog)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) before seeding.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
  console.log(`Admin ready: ${email}`);

  if (!process.argv.includes("--demo")) return;

  const brakes = await db.category.upsert({
    where: { slug: "brakes" },
    update: {},
    create: { name: "Brakes", slug: "brakes" },
  });
  const electrical = await db.category.upsert({
    where: { slug: "electrical" },
    update: {},
    create: { name: "Electrical", slug: "electrical" },
  });
  const maintenance = await db.category.upsert({
    where: { slug: "maintenance" },
    update: {},
    create: { name: "Maintenance", slug: "maintenance" },
  });

  const demo = [
    {
      sku: "DEMO-BRK-1001",
      slug: "ceramic-front-brake-pads-camry",
      title: "Ceramic Front Brake Pad Set",
      brand: "StopRight",
      description: "Low-dust ceramic pads with shims and hardware included.",
      priceCents: 4899,
      compareAtCents: 5999,
      stockQty: 25,
      weightOz: 48,
      lengthIn: 8,
      widthIn: 6,
      heightIn: 3,
      categoryId: brakes.id,
      fitments: [
        { yearStart: 2012, yearEnd: 2017, make: "Toyota", model: "Camry" },
        { yearStart: 2013, yearEnd: 2018, make: "Lexus", model: "ES350" },
      ],
    },
    {
      sku: "DEMO-ALT-2001",
      slug: "remanufactured-alternator-civic",
      title: "Remanufactured Alternator 110A",
      brand: "VoltCore",
      description: "Remanufactured to OE spec. Core deposit refunded when your old alternator is returned.",
      priceCents: 15999,
      coreChargeCents: 4500,
      stockQty: 6,
      weightOz: 192,
      lengthIn: 10,
      widthIn: 9,
      heightIn: 8,
      categoryId: electrical.id,
      fitments: [{ yearStart: 2016, yearEnd: 2021, make: "Honda", model: "Civic", engine: "2.0L L4" }],
    },
    {
      sku: "DEMO-BAT-3001",
      slug: "agm-battery-group-48",
      title: "AGM Battery, Group 48",
      brand: "PowerCell",
      description: "760 CCA absorbed glass mat battery. Ships ground only.",
      priceCents: 21999,
      coreChargeCents: 2200,
      stockQty: 4,
      weightOz: 688,
      lengthIn: 12,
      widthIn: 7.5,
      heightIn: 8,
      hazmat: true,
      categoryId: electrical.id,
      fitments: [
        { yearStart: 2015, yearEnd: 2020, make: "Ford", model: "F-150" },
        { yearStart: 2014, yearEnd: 2019, make: "Chevrolet", model: "Silverado 1500" },
      ],
    },
    {
      sku: "DEMO-MNT-4001",
      slug: "wiper-blade-22-inch",
      title: "Beam Wiper Blade, 22 in",
      brand: "ClearView",
      description: "All-season beam blade with universal adapter kit.",
      priceCents: 1899,
      stockQty: 60,
      weightOz: 8,
      lengthIn: 24,
      widthIn: 3,
      heightIn: 2,
      universalFit: true,
      categoryId: maintenance.id,
      fitments: [],
    },
  ];

  for (const { fitments, ...p } of demo) {
    const exists = await db.product.findUnique({ where: { sku: p.sku } });
    if (exists) continue;
    await db.product.create({ data: { ...p, status: "ACTIVE", fitments: { create: fitments } } });
  }
  console.log(`Demo catalog ready (${demo.length} products).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
