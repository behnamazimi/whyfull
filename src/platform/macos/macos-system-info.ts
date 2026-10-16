import type { CommandRunner, SystemInfo } from "../../application/index.ts";
import { MacCommand, QUICK_COMMAND_TIMEOUT } from "./tools.ts";

const FALLBACK_PRODUCT_NAME = "macOS";

export const macOsSystemInfo = (commands: CommandRunner): SystemInfo => ({
  async describeSystem() {
    const [name, version] = await Promise.all([
      commands.run({ ...MacCommand.productName, timeout: QUICK_COMMAND_TIMEOUT }),
      commands.run({ ...MacCommand.productVersion, timeout: QUICK_COMMAND_TIMEOUT }),
    ]);
    const productName = name.ok ? name.value.standardOutput.trim() : FALLBACK_PRODUCT_NAME;
    return version.ok ? `${productName} ${version.value.standardOutput.trim()}` : productName;
  },
});
