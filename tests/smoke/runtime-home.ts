import path from "node:path";

export const runtimeHomePath = path.resolve(process.env.RUNTIME_HOME_PATH ?? "dist/index.html");
export const runtimeHomeUrl = process.env.RUNTIME_HOME_PATH
  ? `file://${runtimeHomePath}`
  : (process.env.RUNTIME_HOME_URL ?? "http://127.0.0.1:4182/");
