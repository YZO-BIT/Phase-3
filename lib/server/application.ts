import "server-only";
import { readConfig, type ServerConfig } from "./config";
import { AuthService } from "./auth";
import { GoogleSheetsRepository } from "./googleSheets";
import { PrivateStore } from "./privateStore";
import { RegistrationService } from "./registrationService";
import { RegistrationController } from "./controllers";

export function createApplication(config: ServerConfig, dependencies: { sheetFetch?: typeof fetch; googleToken?: () => Promise<string> } = {}) {
  const sheets = new GoogleSheetsRepository(config.google, dependencies.sheetFetch, dependencies.googleToken);
  const store = new PrivateStore(config.privateStorageDir);
  const service = new RegistrationService(sheets, store, config);
  return new RegistrationController(service, new AuthService(config), config);
}
let application: RegistrationController | undefined;
export const getApplication = () => application ??= createApplication(readConfig());
