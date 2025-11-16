import { PrismaClient, Prisma } from "../prisma/generated/client";
const prisma = new PrismaClient();

export default prisma;
export { Prisma };
export * from "../prisma/generated/enums";
