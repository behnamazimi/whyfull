import { describe, expect, test } from "bun:test";
import { ByteSize } from "../../src/domain/index.ts";
import { renderJsonReport } from "../../src/presentation/index.ts";
import { buildTree } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const NODE_MODULES_MEGABYTES = 300;

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "app",
        markers: ["package.json"],
        children: [
          { name: "node_modules", ownFilesSize: ByteSize.fromMegabytes(NODE_MODULES_MEGABYTES) },
        ],
      },
    ],
  }),
);

describe("the JSON report", () => {
  test("writes paths from ~, so a shared report doesn't name the account", () => {
    const json = renderJsonReport(report, SAMPLE_HOME, undefined);
    expect(json).not.toContain(SAMPLE_HOME.toString());
    const parsed: unknown = JSON.parse(json);
    expect(parsed).toMatchObject({
      scannedFolder: "~",
      findings: [{ paths: ["~/app/node_modules"] }],
    });
  });
});
