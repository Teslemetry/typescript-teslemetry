import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "https://api.teslemetry.com/openapi.yaml",
  output: "src/client",
  plugins: [
    {
      name: "@hey-api/client-fetch",
      throwOnError: true,
    },
  ],
});
