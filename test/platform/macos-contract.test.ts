import { createMacOsPlatform } from "../../src/platform/index.ts";
import { describePlatformContract } from "../contracts/platform-contract.ts";

describePlatformContract("macOS", createMacOsPlatform);
