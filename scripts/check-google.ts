import { loadEnvConfig } from "@next/env";
import { readConfig } from "../lib/server/config";
import { GoogleSheetsError, HttpError } from "../lib/server/errors";
import { GoogleSheetsRepository } from "../lib/server/googleSheets";

async function main() {
  try {
    if (process.env.NODE_ENV !== "production") {
      loadEnvConfig(process.cwd(), true, {
        info: () => {},
        error: () => { throw new Error("Local environment configuration could not be loaded."); },
      });
    }
    const config = readConfig();
    const sheets = new GoogleSheetsRepository(config.google);
    const result = await sheets.checkAccess();
    process.stdout.write(`${JSON.stringify({ scope: "google.check", success: true, configuration: sheets.getSafeConfigurationDiagnostics(), authenticationSucceeded: result.authenticationSucceeded, headerMatches: result.headerMatches })}\n`);
  } catch (error) {
    const diagnostic = error instanceof HttpError ? error.diagnostic : undefined;
    const output = {
      scope: "google.check",
      success: false,
      errorType: error instanceof Error ? error.name : "UnknownError",
      status: error instanceof HttpError ? error.status : undefined,
      upstreamStatus: error instanceof GoogleSheetsError ? error.upstreamStatus : undefined,
      googleSheets: diagnostic ? {
        phase: diagnostic.phase,
        configuration: diagnostic.configuration,
        authenticationSucceeded: diagnostic.authenticationSucceeded,
        apiStatus: diagnostic.apiStatus,
        apiReason: diagnostic.apiReason && /^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(diagnostic.apiReason) ? diagnostic.apiReason : undefined,
        authenticationErrorType: diagnostic.authenticationErrorType,
        transportErrorType: diagnostic.transportErrorType,
        transportErrorCode: diagnostic.transportErrorCode,
      } : undefined,
    };
    process.stderr.write(`${JSON.stringify(output)}\n`);
    process.exitCode = 1;
  }
}

void main();
