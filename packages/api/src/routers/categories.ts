import { protectedProcedure } from "../index";
import { z } from "zod";
import prisma from "@favy/db";
import type { Category } from "@favy/shared";

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

const SYSTEM_CATEGORIES = [
  "Technology",
  "Business",
  "Design",
  "Marketing",
  "Development",
  "AI & ML",
  "Career",
  "Productivity",
  "News",
  "Education",
];

function transformCategory(category: any): Category {
  return {
    id: category.id,
    name: category.name,
    userId: category.userId,
    isSystem: category.isSystem,
    createdAt: category.createdAt,
  };
}

async function seedSystemCategories() {
  const existingSystemCategories = await prisma.category.findMany({
    where: {
      isSystem: true,
      userId: null,
    },
  });

  if (existingSystemCategories.length === 0) {
    await prisma.category.createMany({
      data: SYSTEM_CATEGORIES.map((name) => ({
        name,
        isSystem: true,
        userId: null,
      })),
      skipDuplicates: true,
    });
  }
}

export const categoriesRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    await seedSystemCategories();

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { isSystem: true, userId: null }, // System categories
          { userId }, // User's custom categories
        ],
      },
      orderBy: [
        { isSystem: "desc" }, // System categories first
        { name: "asc" }, // Then alphabetically
      ],
      include: {
        _count: {
          select: {
            bookmarks: {
              where: {
                bookmarkPost: {
                  userId,
                },
              },
            },
          },
        },
      },
    });

    return categories.map((category) => ({
      ...transformCategory(category),
      bookmarkCount: category._count.bookmarks,
    }));
  }),

  create: protectedProcedure
    .input(createCategorySchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const existing = await prisma.category.findUnique({
        where: {
          name_userId: {
            name: input.name,
            userId,
          },
        },
      });

      if (existing) {
        throw new Error("Category with this name already exists");
      }

      const category = await prisma.category.create({
        data: {
          name: input.name,
          userId,
          isSystem: false,
        },
      });

      return transformCategory(category);
    }),

  assignToBookmark: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        bookmarkId: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [{ isSystem: true, userId: null }, { userId }],
        },
      });

      if (!category) {
        throw new Error("Category not found");
      }

      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.bookmarkId,
          userId,
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      const existingAssociation = await prisma.bookmarkPostCategory.findUnique({
        where: {
          bookmarkPostId_categoryId: {
            bookmarkPostId: input.bookmarkId,
            categoryId: input.categoryId,
          },
        },
      });

      if (existingAssociation) {
        throw new Error("Bookmark is already assigned to this category");
      }

      await prisma.bookmarkPostCategory.create({
        data: {
          bookmarkPostId: input.bookmarkId,
          categoryId: input.categoryId,
        },
      });

      return { success: true };
    }),

  removeFromBookmark: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        bookmarkId: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const category = await prisma.category.findFirst({
        where: {
          id: input.categoryId,
          OR: [{ isSystem: true, userId: null }, { userId }],
        },
      });

      if (!category) {
        throw new Error("Category not found");
      }

      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.bookmarkId,
          userId,
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      const existingAssociation = await prisma.bookmarkPostCategory.findUnique({
        where: {
          bookmarkPostId_categoryId: {
            bookmarkPostId: input.bookmarkId,
            categoryId: input.categoryId,
          },
        },
      });

      if (!existingAssociation) {
        throw new Error("Bookmark is not assigned to this category");
      }

      await prisma.bookmarkPostCategory.delete({
        where: {
          bookmarkPostId_categoryId: {
            bookmarkPostId: input.bookmarkId,
            categoryId: input.categoryId,
          },
        },
      });

      return { success: true };
    }),
};
