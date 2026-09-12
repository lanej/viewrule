import path from "node:path";
import { homedir } from "node:os";

export function globalConfigDir() {
  return path.resolve(process.env.VIEWRULE_CONFIG_DIR ??
    process.env.UI_REVIEW_GLOBAL_DIR ??
    path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "viewrule"));
}
