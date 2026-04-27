import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { Generate } from "@/helpers/Generate";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeEach, describe, expect, it } from "bun:test";
import { mkdir, readdir } from "fs/promises";
import { join } from "path";
import { FilesystemAdapter } from "./FilesystemAdapter";

describe(FilesystemAdapter.name, async () => {
  let context: TestEnvironment.Context;
  let adapter: FilesystemAdapter;

  beforeEach(async () => {
    context = await TestEnvironment.initialize();
    adapter = new FilesystemAdapter(
      context.env,
      context.propertyResolver,
      new ManagedStorageCapability(context.env),
      new FilterCapability(),
    );
  });

  it("writes files to a directory", async () => {
    // given
    const artifacts = await context.createArtifacts("f:Apple.txt", "f:Banana.txt", "f:Coconut.txt");
    const folderPath = join(context.scratchpad, "storage");
    // when
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: undefined,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath,
      managedStorage: false,
      retention: undefined,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(folderPath);
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Apple.txt", "Banana.txt", "Coconut.txt"]));
  });

  it("writes folders to a directory", async () => {
    // given
    const artifacts = await context.createArtifacts("d:Set", "d:List", "d:Group");
    const folderPath = join(context.scratchpad, "storage");
    // when
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: undefined,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath,
      managedStorage: false,
      retention: undefined,
    };
    await adapter.write(artifacts, step, []);
    // then
    const storage = await readdir(folderPath);
    expect(storage).toHaveLength(3);
    expect(storage).toEqual(expect.arrayContaining(["Set", "List", "Group"]));
  });

  it("merges and partially overwrites with an existing folder when writing artifacts (normal storage)", async () => {
    const secret = `${Math.round(Math.random() * Math.pow(10, 9))}`;

    // given
    const destinationDir = join(context.scratchpad, "destination");
    const originalFiles = ["Nathan-Norris.txt", "Otto-Override.txt", "Peter-Parker.txt"];
    for (const file of originalFiles) {
      await Bun.write(join(destinationDir, file), secret);
    }

    // when
    const artifacts = await context.createArtifacts("f:Otto-Override.txt");
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: undefined,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath: destinationDir,
      managedStorage: false,
      retention: undefined,
    };
    await adapter.write(artifacts, step, []);

    // then
    const entries = (await readdir(destinationDir)).sort();
    expect(entries).toEqual(originalFiles);
    for (const entry of entries) {
      const contents = await Bun.file(join(destinationDir, entry)).text();
      if (entry === "Otto-Override.txt") {
        expect(contents).not.toEqual(secret);
      } else {
        expect(contents).toEqual(secret);
      }
    }
  });

  describe("folderFlatten", () => {
    async function createNestedDirectoryArtifact(name: string): Promise<Artifact> {
      // Build a directory artifact with structure:
      //   <name>/top.txt
      //   <name>/mid/middle.txt
      //   <name>/mid/deep/deep.txt
      const root = join(context.scratchpad, "input", name);
      await mkdir(join(root, "mid", "deep"), { recursive: true });
      await Bun.write(join(root, "top.txt"), "top");
      await Bun.write(join(root, "mid", "middle.txt"), "middle");
      await Bun.write(join(root, "mid", "deep", "deep.txt"), "deep");
      return { id: Generate.shortRandomString(), type: "directory", name, path: root };
    }

    function buildStep(level: number): Step.FolderFlatten {
      return {
        id: Generate.shortRandomString(),
        previousId: undefined,
        object: "step",
        type: Step.Type.folder_flatten,
        level,
      };
    }

    it("level=-1 fully flattens (legacy behaviour)", async () => {
      const artifact = await createNestedDirectoryArtifact("Tree");
      const { artifacts } = await adapter.folderFlatten([artifact], buildStep(-1));
      expect(artifacts).toHaveLength(3);
      expect(artifacts.every((a) => a.type === "file")).toBe(true);
      expect(artifacts.map((a) => a.name).sort()).toEqual(["deep.txt", "middle.txt", "top.txt"]);
    });

    it("level=0 leaves directory artifacts untouched", async () => {
      const artifact = await createNestedDirectoryArtifact("Tree");
      const { artifacts } = await adapter.folderFlatten([artifact], buildStep(0));
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0]!.type).toBe("directory");
      expect(artifacts[0]!.name).toBe("Tree");
    });

    it("level=1 emits immediate children (files become files, sub-dirs stay as directories)", async () => {
      const artifact = await createNestedDirectoryArtifact("Tree");
      const { artifacts } = await adapter.folderFlatten([artifact], buildStep(1));
      expect(artifacts).toHaveLength(2);
      const fileNames = artifacts.filter((a) => a.type === "file").map((a) => a.name);
      const dirNames = artifacts.filter((a) => a.type === "directory").map((a) => a.name);
      expect(fileNames).toEqual(["top.txt"]);
      expect(dirNames).toEqual(["mid"]);
      // The preserved directory still contains its nested structure
      const midEntries = (await readdir(artifacts.find((a) => a.type === "directory")!.path)).sort();
      expect(midEntries).toEqual(["deep", "middle.txt"]);
    });

    it("level=2 descends two levels deep", async () => {
      const artifact = await createNestedDirectoryArtifact("Tree");
      const { artifacts } = await adapter.folderFlatten([artifact], buildStep(2));
      expect(artifacts).toHaveLength(3);
      const files = artifacts.filter((a) => a.type === "file").map((a) => a.name).sort();
      const dirs = artifacts.filter((a) => a.type === "directory").map((a) => a.name);
      expect(files).toEqual(["middle.txt", "top.txt"]);
      expect(dirs).toEqual(["deep"]);
    });

    it("level higher than depth fully flattens", async () => {
      const artifact = await createNestedDirectoryArtifact("Tree");
      const { artifacts } = await adapter.folderFlatten([artifact], buildStep(99));
      expect(artifacts).toHaveLength(3);
      expect(artifacts.every((a) => a.type === "file")).toBe(true);
    });

    it("file artifacts always pass through regardless of level", async () => {
      const fileArtifacts = await context.createArtifacts("f:Apple.txt", "f:Banana.txt");
      const { artifacts } = await adapter.folderFlatten(fileArtifacts, buildStep(0));
      expect(artifacts.map((a) => a.name).sort()).toEqual(["Apple.txt", "Banana.txt"]);
    });
  });

  it("merges with an existing folder when writing artifacts (managed storage)", async () => {
    const secret = `${Math.round(Math.random() * Math.pow(10, 9))}`;

    // given
    const destinationDir = join(context.scratchpad, "destination");
    const existingFile = Bun.file(join(destinationDir, "index.html"));
    await existingFile.write(secret);

    // when
    const artifacts = await context.createArtifacts("f:irrelevant.txt");
    const step: Step.FilesystemWrite = {
      id: Generate.shortRandomString(),
      previousId: undefined,
      type: Step.Type.filesystem_write,
      object: "step",
      folderPath: destinationDir,
      managedStorage: true,
      retention: undefined,
    };
    await adapter.write(artifacts, step, []);

    // then
    const entries = (await readdir(destinationDir)).sort();
    expect(entries).toEqual(expect.arrayContaining(["__brespi_manifest__.json", "index.html"]));
    expect(await existingFile.text()).toEqual(secret);
  });
});
