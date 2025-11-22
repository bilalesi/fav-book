import { prisma, Prisma } from "@favy/db";

/**
 * Get all bookmark enrichments with flexible query options
 * Automatically filters by userId for security
 * @param query - Prisma findMany query options
 * @param userId - The ID of the user (for ownership filtering)
 * @returns Array of bookmark enrichments matching the query
 */
export async function get_user_bookmark_enrichments(
  query: Omit<Prisma.BookmarkEnrichmentFindManyArgs, "where"> & {
    where?: Omit<Prisma.BookmarkEnrichmentWhereInput, "bookmarkPost">;
  },
  userId: string
) {
  return await prisma.bookmarkEnrichment.findMany({
    ...query,
    where: {
      ...query.where,
      bookmarkPost: {
        userId,
      },
    },
  });
}

/**
 * Get a specific bookmark enrichment by ID with flexible query options
 * Automatically filters by userId for security
 * @param query - Prisma findFirst query options
 * @param id - The bookmark enrichment ID
 * @param userId - The ID of the user (for ownership verification)
 * @returns The bookmark enrichment if found and owned by user, null otherwise
 */
export async function get_bookmark_enrichment_by_id(
  query: Omit<Prisma.BookmarkEnrichmentFindFirstArgs, "where"> & {
    where?: Omit<Prisma.BookmarkEnrichmentWhereInput, "id" | "bookmarkPost">;
  },
  id: string,
  userId: string
) {
  return await prisma.bookmarkEnrichment.findFirst({
    ...query,
    where: {
      ...query.where,
      id,
      bookmarkPost: {
        userId,
      },
    },
  });
}

/**
 * Get all enrichments for a specific bookmark with flexible query options
 * Automatically filters by userId for security
 * @param query - Prisma findMany query options
 * @param bookmark_id - The bookmark post ID
 * @param userId - The ID of the user (for ownership verification)
 * @returns Array of enrichments for the bookmark if owned by user
 */
export async function get_enrichments_by_bookmark_id(
  query: Omit<Prisma.BookmarkEnrichmentFindManyArgs, "where"> & {
    where?: Omit<
      Prisma.BookmarkEnrichmentWhereInput,
      "bookmarkPostId" | "bookmarkPost"
    >;
  },
  bookmark_id: string,
  userId: string
) {
  return await prisma.bookmarkEnrichment.findMany({
    ...query,
    where: {
      ...query.where,
      bookmarkPostId: bookmark_id,
      bookmarkPost: {
        userId,
      },
    },
  });
}

/**
 * Create a new bookmark enrichment with flexible query options
 * Automatically verifies bookmark ownership
 * @param query - Prisma create query options
 * @param userId - The ID of the user creating the enrichment (for ownership verification)
 * @returns The created bookmark enrichment if bookmark is owned by user, null otherwise
 */
export async function create_bookmark_enrichment(
  query: Prisma.BookmarkEnrichmentCreateArgs,
  userId: string
) {
  // First verify that the bookmark exists and belongs to the user
  const bookmarkId = query.data.bookmarkPost?.connect?.id;

  if (!bookmarkId) {
    return null;
  }

  const bookmark = await prisma.bookmarkPost.findFirst({
    where: {
      id: bookmarkId,
      userId,
    },
  });

  if (!bookmark) {
    return null;
  }

  return await prisma.bookmarkEnrichment.create(query);
}

/**
 * Update a bookmark enrichment with flexible query options and ownership check
 * @param query - Prisma update query options
 * @param id - The bookmark enrichment ID
 * @param userId - The ID of the user (for ownership verification)
 * @returns The updated bookmark enrichment if found and owned by user, null otherwise
 */
export async function update_bookmark_enrichment(
  query: Omit<Prisma.BookmarkEnrichmentUpdateArgs, "where">,
  id: string,
  userId: string
) {
  // First check if the enrichment exists and belongs to the user
  const existing = await get_bookmark_enrichment_by_id({}, id, userId);

  if (!existing) {
    return null;
  }

  return await prisma.bookmarkEnrichment.update({
    ...query,
    where: {
      id,
    },
  });
}

/**
 * Delete a bookmark enrichment with flexible query options and ownership check
 * @param query - Prisma delete query options
 * @param id - The bookmark enrichment ID
 * @param userId - The ID of the user (for ownership verification)
 * @returns The deleted bookmark enrichment if found and owned by user, null otherwise
 */
export async function delete_bookmark_enrichment(
  query: Omit<Prisma.BookmarkEnrichmentDeleteArgs, "where">,
  id: string,
  userId: string
) {
  // First check if the enrichment exists and belongs to the user
  const existing = await get_bookmark_enrichment_by_id({}, id, userId);

  if (!existing) {
    return null;
  }

  return await prisma.bookmarkEnrichment.delete({
    ...query,
    where: {
      id,
    },
  });
}
