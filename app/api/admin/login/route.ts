import { getApplication } from "@/lib/server/application";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => getApplication().login(request);
