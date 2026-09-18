import { env } from "@/env";
import packageJson from "@/package.json";

/** Display version: Docker/release-please tag, else package.json. */
export function getAppVersion(): string {
  const fromEnv = env.NEXT_PUBLIC_APP_VERSION?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("v") ? fromEnv : `v${fromEnv}`;
  }
  const pkg = packageJson.version;
  return pkg.startsWith("v") ? pkg : `v${pkg}`;
}
