import { appendFileSync } from "fs";
import { join } from "path";

const logFile = join(process.cwd(), "auth-debug.log");

export function fileLog(...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    )
    .join(" ");

  const logLine = `[${timestamp}] ${message}\n`;

  // Write to file
  try {
    appendFileSync(logFile, logLine);
  } catch (e) {
    // Ignore file write errors
  }

  // Also write to stderr and stdout
  process.stderr.write(logLine);
  console.log(...args);
}
