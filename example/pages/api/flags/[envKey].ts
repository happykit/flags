import { createApiRoute } from "@happykit/flags/api-route";
import { getDefinitions } from "flags/storage";

export const config = { runtime: "experimental-edge" };

// This route can be used by the browser/client to evaluate feature flags
//
// Defining it on the application itself means even client-side evaluations
// will happen on the same domain, saving you DNS lookups.
export default createApiRoute({ getDefinitions, serverTiming: true });
