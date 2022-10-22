import { unstable_createReadHandler } from "@happykit/flags/api-route";
import { getDefinitions } from "flags/storage";

export const config = { runtime: "experimental-edge" };

export default unstable_createReadHandler({ getDefinitions });
