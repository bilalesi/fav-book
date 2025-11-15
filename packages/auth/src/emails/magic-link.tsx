import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface MagicLinkEmailProps {
  magicLink: string;
  userEmail: string;
}

export const MagicLinkEmail = ({
  magicLink,
  userEmail,
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Sign in to Social Bookmarks Manager</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Sign in to Social Bookmarks Manager</Heading>
        <Text style={text}>
          Hello! Click the button below to sign in to your account. This link
          will expire in 15 minutes.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={magicLink}>
            Sign In
          </Button>
        </Section>
        <Text style={text}>Or copy and paste this URL into your browser:</Text>
        <Link href={magicLink} style={link}>
          {magicLink}
        </Link>
        <Text style={footer}>
          If you didn't request this email, you can safely ignore it.
        </Text>
        <Text style={footer}>This email was sent to {userEmail}</Text>
      </Container>
    </Body>
  </Html>
);

MagicLinkEmail.PreviewProps = {
  magicLink: "https://example.com/auth/verify?token=abc123",
  userEmail: "[email]",
} as MagicLinkEmailProps;

export default MagicLinkEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "560px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 40px",
};

const buttonContainer = {
  padding: "27px 0 27px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "4px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "200px",
  padding: "14px 7px",
  margin: "0 auto",
};

const link = {
  color: "#5469d4",
  fontSize: "14px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
  padding: "0 40px",
  display: "block",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 40px",
  marginTop: "16px",
};
