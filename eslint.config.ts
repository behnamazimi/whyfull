import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const Layer = {
  Domain: "domain",
  Application: "application",
  Platform: "platform",
  Infrastructure: "infrastructure",
  Presentation: "presentation",
  Cli: "cli",
} as const;

const LAYER_ENTRY_POINT = "index.ts";

const layerElements = Object.values(Layer).map((layer) => ({
  type: layer,
  pattern: `src/${layer}`,
}));

const publicApiOf = (...layers: readonly string[]) =>
  layers.map((type) => ({ element: { type, fileInternalPath: LAYER_ENTRY_POINT } }));

const externalModules = (...sources: readonly string[]) =>
  sources.map((source) => ({ module: { origin: ["external", "core"], source } }));

const RUNTIME_MODULES = ["node:*", "bun", "bun:*"];
const VALIDATION_MODULES = ["zod"];
const UI_MODULES = ["react", "react/*", "@opentui/*"];

export default defineConfig(
  { ignores: ["node_modules", "dist"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: false },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [0, 1],
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: false,
        },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "TSEnumDeclaration", message: "Use an `as const` object and a derived union." },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": layerElements,
      "import/resolver": { node: { extensions: [".ts", ".tsx"] } },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkInternals: false,
          checkAllOrigins: true,
          policies: [
            {
              from: { element: { type: Layer.Domain } },
              allow: { to: publicApiOf(Layer.Domain) },
            },
            {
              from: { element: { type: Layer.Application } },
              allow: { to: publicApiOf(Layer.Domain, Layer.Application) },
            },
            {
              from: { element: { type: Layer.Platform } },
              allow: {
                to: [
                  ...publicApiOf(Layer.Domain, Layer.Application, Layer.Infrastructure),
                  ...externalModules(...RUNTIME_MODULES, ...VALIDATION_MODULES),
                ],
              },
            },
            {
              from: { element: { type: Layer.Infrastructure } },
              allow: {
                to: [
                  ...publicApiOf(Layer.Domain, Layer.Application),
                  ...externalModules(...RUNTIME_MODULES, ...VALIDATION_MODULES),
                ],
              },
            },
            {
              from: { element: { type: Layer.Presentation } },
              allow: {
                to: [
                  ...publicApiOf(Layer.Domain, Layer.Application),
                  ...externalModules(...UI_MODULES),
                ],
              },
            },
            {
              from: { element: { type: Layer.Cli } },
              allow: {
                to: [
                  ...publicApiOf(
                    Layer.Domain,
                    Layer.Application,
                    Layer.Platform,
                    Layer.Infrastructure,
                    Layer.Presentation,
                  ),
                  ...externalModules(...RUNTIME_MODULES, ...UI_MODULES),
                ],
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["*.config.ts", "test/**/*.ts"],
    rules: { "@typescript-eslint/no-magic-numbers": "off" },
  },
);
