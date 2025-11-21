import { prisma } from "@favy/db";
import { z } from "zod";

import { protected_middleware } from "@/middleware/protected";

const preferences_schema = z.object({
	defaultView: z.enum(["card", "table"]).optional(),
	itemsPerPage: z.number().min(10).max(100).optional(),
	theme: z.enum(["light", "dark", "system"]).optional(),
});

export const user_router = {
	retrieve_profile: protected_middleware.handler(async ({ context }) => {
		const user = await prisma.user.findUnique({
			where: { id: context.session.user.id },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				createdAt: true,
				preferences: true,
				_count: {
					select: {
						bookmarkPosts: true,
						collections: true,
						categories: true,
					},
				},
			},
		});

		return user;
	}),

	update_preferences: protected_middleware
		.input(preferences_schema)
		.handler(async ({ context, input }) => {
			const currentUser = await prisma.user.findUnique({
				where: { id: context.session.user.id },
				select: { preferences: true },
			});

			const currentPreferences =
				(currentUser?.preferences as Record<string, unknown>) || {};
			const updatedPreferences = { ...currentPreferences, ...input };

			const user = await prisma.user.update({
				where: { id: context.session.user.id },
				data: {
					preferences: updatedPreferences,
				},
				select: {
					id: true,
					name: true,
					email: true,
					preferences: true,
				},
			});

			return user;
		}),

	update_profile: protected_middleware
		.input(
			z.object({
				name: z.string().min(1).max(100).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const user = await prisma.user.update({
				where: { id: context.session.user.id },
				data: {
					name: input.name,
				},
				select: {
					id: true,
					name: true,
					email: true,
					preferences: true,
				},
			});

			return user;
		}),
};
