import { prisma } from "@favy/db";
import {
	DictPlatform,
	type IBookmarkPost,
	type IDashboardStats,
} from "@favy/shared";
import { z } from "zod";
import { protected_middleware } from "@/middleware/protected";

function transformBookmarkPost(bookmark: any): IBookmarkPost {
	return {
		id: bookmark.id,
		userId: bookmark.userId,
		platform: bookmark.platform,
		postId: bookmark.postId,
		postUrl: bookmark.postUrl,
		content: bookmark.content,
		authorName: bookmark.authorName,
		authorUsername: bookmark.authorUsername,
		authorProfileUrl: bookmark.authorProfileUrl,
		savedAt: bookmark.savedAt,
		createdAt: bookmark.createdAt,
		viewCount: bookmark.viewCount,
		metadata: bookmark.metadata as Record<string, any> | undefined,
		media: bookmark.media?.map((m: any) => ({
			id: m.id,
			bookmarkPostId: m.bookmarkPostId,
			type: m.type,
			url: m.url,
			thumbnailUrl: m.thumbnailUrl,
			metadata: m.metadata as Record<string, any> | undefined,
		})),
		collections: bookmark.collections?.map((bc: any) => ({
			id: bc.collection.id,
			userId: bc.collection.userId,
			name: bc.collection.name,
			description: bc.collection.description,
			createdAt: bc.collection.createdAt,
			updatedAt: bc.collection.updatedAt,
		})),
		categories: bookmark.categories?.map((bc: any) => ({
			id: bc.category.id,
			name: bc.category.name,
			userId: bc.category.userId,
			isSystem: bc.category.isSystem,
			createdAt: bc.category.createdAt,
		})),
	};
}

// Simple in-memory cache for dashboard stats
// Cache is keyed by userId and expires after 5 minutes
// This reduces database load for frequently accessed dashboard data
const statsCache = new Map<
	string,
	{ data: IDashboardStats; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000;

export const dashboard_router = {
	retrieve_stats: protected_middleware.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const cached = statsCache.get(userId);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
			return cached.data;
		}
		const totalBookmarks = await prisma.bookmarkPost.count({
			where: { userId },
		});

		const twitterCount = await prisma.bookmarkPost.count({
			where: { userId, platform: DictPlatform.TWITTER },
		});

		const linkedinCount = await prisma.bookmarkPost.count({
			where: { userId, platform: DictPlatform.LINKEDIN },
		});

		const genericUrlCount = await prisma.bookmarkPost.count({
			where: { userId, platform: DictPlatform.GENERIC_URL },
		});

		const recentBookmarksData = await prisma.bookmarkPost.findMany({
			where: { userId },
			take: 5,
			orderBy: { savedAt: "desc" },
			include: {
				media: true,
				collections: {
					include: {
						collection: true,
					},
				},
				categories: {
					include: {
						category: true,
					},
				},
			},
		});

		const mostViewedData = await prisma.bookmarkPost.findMany({
			where: { userId },
			take: 5,
			orderBy: { viewCount: "desc" },
			include: {
				media: true,
				collections: {
					include: {
						collection: true,
					},
				},
				categories: {
					include: {
						category: true,
					},
				},
			},
		});

		const categoryBreakdown = await prisma.bookmarkPostCategory.groupBy({
			by: ["categoryId"],
			where: {
				bookmarkPost: {
					userId,
				},
			},
			_count: {
				categoryId: true,
			},
			orderBy: {
				_count: {
					categoryId: "desc",
				},
			},
		});

		const categoryIds = categoryBreakdown.map((cb) => cb.categoryId);
		const categories = await prisma.category.findMany({
			where: {
				id: {
					in: categoryIds,
				},
			},
		});

		const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

		const topicBreakdown = categoryBreakdown.map((cb) => ({
			categoryName: categoryMap.get(cb.categoryId) || "Unknown",
			count: cb._count.categoryId,
		}));

		const stats: IDashboardStats = {
			totalBookmarks,
			bookmarksByPlatform: {
				twitter: twitterCount,
				linkedin: linkedinCount,
				genericUrl: genericUrlCount,
			},
			recentBookmarks: recentBookmarksData.map(transformBookmarkPost),
			mostViewed: mostViewedData.map(transformBookmarkPost),
			topicBreakdown,
		};

		statsCache.set(userId, { data: stats, timestamp: Date.now() });

		return stats;
	}),

	retrieve_recent_bookmarks: protected_middleware
		.input(
			z.object({
				limit: z.number().int().positive().max(50).default(10),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const bookmarks = await prisma.bookmarkPost.findMany({
				where: { userId },
				take: input.limit,
				orderBy: { savedAt: "desc" },
				include: {
					media: true,
					collections: {
						include: {
							collection: true,
						},
					},
					categories: {
						include: {
							category: true,
						},
					},
				},
			});

			return bookmarks.map(transformBookmarkPost);
		}),

	retrieve_most_viewed: protected_middleware
		.input(
			z.object({
				limit: z.number().int().positive().max(50).default(10),
			}),
		)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const bookmarks = await prisma.bookmarkPost.findMany({
				where: { userId },
				take: input.limit,
				orderBy: { viewCount: "desc" },
				include: {
					media: true,
					collections: {
						include: {
							collection: true,
						},
					},
					categories: {
						include: {
							category: true,
						},
					},
				},
			});

			return bookmarks.map(transformBookmarkPost);
		}),

	retrieve_topic_breakdown: protected_middleware.handler(
		async ({ context }) => {
			const userId = context.session.user.id;
			const categoryBreakdown = await prisma.bookmarkPostCategory.groupBy({
				by: ["categoryId"],
				where: {
					bookmarkPost: {
						userId,
					},
				},
				_count: {
					categoryId: true,
				},
				orderBy: {
					_count: {
						categoryId: "desc",
					},
				},
			});

			const categoryIds = categoryBreakdown.map((cb) => cb.categoryId);
			const categories = await prisma.category.findMany({
				where: {
					id: {
						in: categoryIds,
					},
				},
			});

			const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

			return categoryBreakdown.map((cb) => ({
				categoryName: categoryMap.get(cb.categoryId) || "Unknown",
				count: cb._count.categoryId,
			}));
		},
	),
};
