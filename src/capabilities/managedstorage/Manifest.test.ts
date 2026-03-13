import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "bun:test";
import { Manifest } from "./Manifest";
import { Version } from "./Version";

describe("Manifest", () => {
  describe("Item", () => {
    it("sorts from new to old", () => {
      // given
      const uploads: Manifest.Item[] = [
        {
          listingPath: "now",
          totalSize: 1,
          version: Version.now(),
        },
        {
          listingPath: "past",
          totalSize: 1,
          version: Temporal.Now.instant()
            .subtract({ hours: 100 * 24 })
            .toString(),
        },
        {
          listingPath: "future",
          totalSize: 1,
          version: Temporal.Now.instant()
            .add({ hours: 100 * 24 })
            .toString(),
        },
      ];
      // when
      uploads.sort(Manifest.Item.sort);
      // then
      const paths = uploads.map(({ listingPath: path }) => path);
      expect(paths).toEqual(["future", "now", "past"]);
    });
  });
});
