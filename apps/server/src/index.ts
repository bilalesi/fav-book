import { app } from "@/app";

app.listen(3000, () => {
	console.log("🚀 Server is running on http://localhost:3000");
	console.log("📚 API Documentation: http://localhost:3000/api-reference");
	console.log("🔐 Auth endpoints: http://localhost:3000/api/auth/*");
	console.log("");

	const workflowEngine = process.env.WORKFLOW_ENGINE || "restate";
	console.log("⚙️  Workflow Configuration:");
	console.log(`  - Engine: ${workflowEngine}`);

	const ingressUrl = process.env.RESTATE_INGRESS_URL || "http://localhost:8080";
	const adminUrl = process.env.RESTATE_ADMIN_URL || "http://localhost:9070";
	console.log(`  - Restate Ingress: ${ingressUrl}`);
	console.log(`  - Restate Admin: ${adminUrl}`);
	console.log("");
	console.log("Available auth endpoints:");
	console.log("  - POST /api/auth/sign-in/email - Email/password sign in");
	console.log("  - POST /api/auth/sign-up/email - Email/password sign up");
	console.log("  - GET  /api/auth/twitter - Twitter OAuth");
	console.log("  - GET  /api/auth/linkedin - LinkedIn OAuth");
	console.log("  - POST /api/auth/send-verification-email - Send magic link");
	console.log("  - GET  /api/auth/verify-email - Verify magic link");
	console.log("  - POST /api/auth/sign-out - Sign out");
	console.log("  - GET  /api/session - Get current session");
});
