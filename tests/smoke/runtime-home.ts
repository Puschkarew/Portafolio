import path from "node:path";

export const runtimeHomePath = path.resolve(process.env.RUNTIME_HOME_PATH ?? "dist/index.html");
export const runtimeHomeUrl = `file://${runtimeHomePath}`;
