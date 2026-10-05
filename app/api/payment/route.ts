import { getApplication } from "@/lib/server/application";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => getApplication().payment(request);
