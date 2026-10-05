import { getApplication } from "@/lib/server/application";
import type { IdContext } from "@/lib/server/controllers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request, context: IdContext) => getApplication().proof(request, context);
