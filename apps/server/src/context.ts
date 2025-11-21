import { auth } from "@favy/auth";
import type { Context as ElysiaContext } from "elysia";

export type TCreateContextOptions = {
	context: ElysiaContext;
};

export async function create_context({ context }: TCreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.request.headers,
	});
	return {
		session,
	};
}

export type TAppContext = Awaited<ReturnType<typeof create_context>>;
