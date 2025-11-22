import { prisma, Prisma } from "@favy/db";

/**
 * Get all bookmark posts with flexible query options
 * Automatically filters by userId for security
 * @param query - Prisma findMany query options
 * @param userId - The ID of the user (for ownership filtering)
 * @returns Array of bookmark posts matching the query
 */
export async function get_user_bookmark_posts(
  query: Omit<Prisma.BookmarkPostFindManyArgs, "where"> & {
    where?: Omit<Prisma.BookmarkPostWhereInput, "userId">;
  },
  userId: string
) {
  return await prisma.bookmarkPost.findMany({
    ...query,
    where: {
      ...query.where,
      userId,
    },
  });
}

/**
 * Get a specific bookmark post by ID with flexible query options
 * Automatically filters by userId for security
 * @param query - Prisma findFirst query options
 * @param userId - The ID of the user (for ownership verification)
 * @returns The bookmark post if found and owned by user, null otherwise
 */
export async function get_bookmark_post_by_id(
  query: Omit<Prisma.BookmarkPostFindFirstArgs, "where"> & {
    where?: Omit<Prisma.BookmarkPostWhereInput, "id" | "userId">;
  },
  id: string,
  userId: string
) {
  return await prisma.bookmarkPost.findFirst({
    ...query,
    where: {
      ...query.where,
      id,
      userId,
    },
  });
}

/**
 * Create a new bookmark post with flexible query options
 * Automatically sets userId and savedAt
 * @param query - Prisma create query options
 * @param userId - The ID of the user creating the bookmark
 * @returns The created bookmark post
 */
export async function create_bookmark_post(
  query: Omit<Prisma.BookmarkPostCreateArgs, "data"> & {
    data: Omit<Prisma.BookmarkPostCreateInput, "user" | "savedAt">;
  },
  userId: string
) {
  return await prisma.bookmarkPost.create({
    ...query,
    data: {
      ...query.data,
      user: {
        connect: {
          id: userId,
        },
      },
      savedAt: new Date(),
    },
  });
}

/**
 * Update a bookmark post with flexible query options and ownership check
 * @param query - Prisma update query options
 * @param id - The bookmark post ID
 * @param userId - The ID of the user (for ownership verification)
 * @returns The updated bookmark post if found and owned by user, null otherwise
 */
export async function update_bookmark_post(
  query: Omit<Prisma.BookmarkPostUpdateArgs, "where">,
  id: string,
  userId: string
) {
  // First check if the bookmark exists and belongs to the user
  const existing = await get_bookmark_post_by_id({}, id, userId);

  if (!existing) {
    return null;
  }

  return await prisma.bookmarkPost.update({
    ...query,
    where: {
      id,
    },
  });
}

/**
 * Delete a bookmark post with flexible query options and ownership check
 * @param query - Prisma delete query options
 * @param id - The bookmark post ID
 * @param userId - The ID of the user (for ownership verification)
 * @returns The deleted bookmark post if found and owned by user, null otherwise
 */
export async function delete_bookmark_post(
  query: Prisma.BookmarkPostDeleteArgs,
  userId: string
) {
  // Prisma will handle cascade delete for enrichments automatically
  // due to onDelete: Cascade in the schema
  return await prisma.bookmarkPost.delete({
    ...query,
    where: {
      ...query.where,
      userId,
    },
  });
}
