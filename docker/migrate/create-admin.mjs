// Creates or resets the admin login inside the container:
//   docker compose exec -e ADMIN_EMAIL=you@x.com -e ADMIN_PASSWORD='...' app node /opt/migrate/create-admin.mjs
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const hash = await bcrypt.hash(password, 12);
await client.query(
  `INSERT INTO "AdminUser" (id, email, "passwordHash", "createdAt")
   VALUES ($1, $2, $3, now())
   ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash"`,
  [`adm_${randomBytes(12).toString("hex")}`, email, hash],
);
await client.end();
console.log(`Admin ready: ${email}`);
