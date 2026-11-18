import { toNextJsHandler } from "better-auth/next-js";
import { withApiLogging } from "@/lib/api-logger";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export const GET = withApiLogging(handlers.GET);
export const POST = withApiLogging(handlers.POST);
