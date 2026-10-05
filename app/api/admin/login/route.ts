import { getApplication } from "@/lib/server/application";
export const runtime = "nodejs";
export const POST = (request: Request) => getApplication().login(request);
