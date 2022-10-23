import { createApiRoute } from "@happykit/flags/api-route";
import { getDefinitions } from "flags/storage";

export const config = { runtime: "experimental-edge" };

export default createApiRoute({ getDefinitions, serverTiming: true });
