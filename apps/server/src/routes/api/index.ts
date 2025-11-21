import type { RouterClient } from "@orpc/server";
import {
	protected_middleware,
	public_middleware,
} from "@/middleware/protected";
import { bookmarks_router } from "@/routes/api/bookmarks";
import { categories_router } from "@/routes/api/categories";
import { collections_router } from "@/routes/api/collections";
import { dashboard_router } from "@/routes/api/dashboard";
import { feature_flags_router } from "@/routes/api/feature-flags";
import { monitoring_router } from "@/routes/api/monitoring";
import { twitter_import_router } from "@/routes/api/twitter-import";
import { user_router } from "@/routes/api/user";

export const api_router = {
	probe: public_middleware.handler(() => {
		return "OK";
	}),
	private: protected_middleware.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	bookmarks: bookmarks_router,
	collections: collections_router,
	categories: categories_router,
	dashboard: dashboard_router,
	user: user_router,
	feature_flags: feature_flags_router,
	monitoring: monitoring_router,
	twitter_import: twitter_import_router,
};
export type TApiRouter = typeof api_router;
export type TAppRouterClient = RouterClient<typeof api_router>;
