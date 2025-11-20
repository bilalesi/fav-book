import { protectedProcedure, publicProcedure } from "../index";
import type { RouterClient } from "@orpc/server";
import { bookmarksRouter } from "./bookmarks";
import { collectionsRouter } from "./collections";
import { categoriesRouter } from "./categories";
import { dashboardRouter } from "./dashboard";
import { userRouter } from "./user";
import { featureFlagsRouter } from "./feature-flags";
import { monitoringRouter } from "./monitoring";
import { twitterImportRouter } from "./twitter-import";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  bookmarks: bookmarksRouter,
  collections: collectionsRouter,
  categories: categoriesRouter,
  dashboard: dashboardRouter,
  user: userRouter,
  featureFlags: featureFlagsRouter,
  monitoring: monitoringRouter,
  twitterImport: twitterImportRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
