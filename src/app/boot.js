import { createApp } from "./facade.js";
import { bootUi } from "../ui/app_shell.js";

export async function boot(root) {
  const app = createApp();
  await bootUi(root, app);
  return app;
}
