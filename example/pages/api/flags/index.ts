import { createWriteHandler } from "@happykit/flags/api-route";

export const config = { runtime: "experimental-edge" };

export default createWriteHandler({
  apiKey: "",
  async setDefinitions(definitions) {
    return true;
  },
});
