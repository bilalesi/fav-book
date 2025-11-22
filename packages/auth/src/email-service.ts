import { Resend } from "resend";
import { render } from "@react-email/components";
import MagicLinkEmail from "./emails/magic-link";

let resend_instance: Resend | null = null;

function get_resend_instance(): Resend {
  if (!resend_instance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. Please add it to your .env file."
      );
    }
    resend_instance = new Resend(apiKey);
  }
  return resend_instance;
}

export interface ISendMagicLinkEmailParams {
  to: string;
  magicLink: string;
}

export async function send_magic_link_email({
  to,
  magicLink,
}: ISendMagicLinkEmailParams): Promise<{ success: boolean; error?: string }> {
  console.log("\n" + "=".repeat(80));
  console.log("📧 SENDING MAGIC LINK EMAIL");
  console.log("=".repeat(80));
  console.log("📬 To:", to);
  console.log("� Magiac Link:", magicLink);
  console.log("⏰ Timestamp:", new Date().toISOString());
  console.log(
    "🔑 API Key:",
    process.env.RESEND_API_KEY ? "✅ Set" : "❌ Missing"
  );
  console.log(
    "📨 From:",
    process.env.EMAIL_FROM || "❌ Not set (using default)"
  );

  try {
    const resend = get_resend_instance();

    console.log("\n� Rendenring email HTML...");
    const emailHtml = await render(
      MagicLinkEmail({
        magicLink,
        userEmail: to,
      })
    );
    console.log("✅ Email HTML rendered successfully");
    console.log("� HTML length:t", emailHtml.length, "characters");

    const emailFrom =
      process.env.EMAIL_FROM || "Social Bookmarks <noreply@yourdomain.com>";
    console.log("\n🚀 Calling Resend API...");
    console.log("   From:", emailFrom);
    console.log("   To:", to);
    console.log("   Subject: Sign in to Social Bookmarks Manager");

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject: "Sign in to Social Bookmarks Manager",
      html: emailHtml,
    });

    if (error) {
      console.log("❌ RESEND API RETURNED ERROR");
      console.log("Error object:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log("✅ EMAIL SENT SUCCESSFULLY!");
    console.log("📧 Email ID:", data?.id);
    return { success: true };
  } catch (error) {
    console.log("❌ EXCEPTION CAUGHT IN sendMagicLinkEmail");
    console.log("Error type:", error?.constructor?.name);
    console.log("Error:", error);
    if (error instanceof Error) {
      console.log("Message:", error.message);
      console.log("Stack:", error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
