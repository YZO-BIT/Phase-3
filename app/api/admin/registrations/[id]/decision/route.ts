import { getApplication } from "@/lib/server/application";
import type { IdContext } from "@/lib/server/controllers";
export const runtime = "nodejs";
export const POST = (request: Request, context: IdContext) => getApplication().decide(request, context);
