import "dotenv/config";
import { PrismaClient } from "../prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  "Technology",
  "Programming",
  "AI & Machine Learning",
  "Web Development",
  "DevOps",
  "Design",
  "Business",
  "Marketing",
  "Productivity",
  "Science",
  "Education",
  "News",
  "Entertainment",
  "Health",
  "Finance",
];

async function main() {
  console.log("🌱 Seeding database with default categories...");

  for (const categoryName of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name: categoryName,
        isSystem: true,
        userId: null,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: categoryName,
          isSystem: true,
          userId: null,
        },
      });
      console.log(`✓ Created category: ${categoryName}`);
    } else {
      console.log(`- Category already exists: ${categoryName}`);
    }
  }

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
