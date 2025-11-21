import { ORPCError, os } from "@orpc/server";
import type { TAppContext } from "@/context";

export const o = os.$context<TAppContext>();

export const public_middleware = o;

const require_auth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

export const protected_middleware = public_middleware.use(require_auth);
