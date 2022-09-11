import { unstable_createWriteHandler } from "@happykit/flags/api-route";

export const config = { runtime: "experimental-edge" };

export default unstable_createWriteHandler({
  apiKey: "",
  async setDefinitions(definitions) {
    return true;
  },
});
