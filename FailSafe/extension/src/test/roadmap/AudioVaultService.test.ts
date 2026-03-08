import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { AudioVaultService } from "../../roadmap/services/AudioVaultService";

suite("AudioVaultService Tests", () => {
  let workspaceRoot: string;
  let service: AudioVaultService;

  setup(async () => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "failsafe-test-"));
    service = new AudioVaultService(workspaceRoot);
    await service.init();
  });

  teardown(function () {
    this.timeout(10000);
    try {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    } catch {
      // Windows may hold brief locks on temp dirs; swallow cleanup errors
    }
  });

  test("init creates .failsafe/audio directory", () => {
    const expectedPath = path.join(workspaceRoot, ".failsafe", "audio");
    assert.ok(fs.existsSync(expectedPath), "Directory should exist");
  });

  test("storeAudio stores file and returns sha256 hash", async () => {
    const dummyBuffer = Buffer.from("dummy audio content");
    const hash = await service.storeAudio(dummyBuffer, "transcript here");
    assert.ok(hash.length === 64, "Returns valid sha256 hash string");

    const webmPath = path.join(
      workspaceRoot,
      ".failsafe",
      "audio",
      `${hash}.webm`,
    );
    const jsonPath = path.join(
      workspaceRoot,
      ".failsafe",
      "audio",
      `${hash}.json`,
    );

    assert.ok(fs.existsSync(webmPath), "WebM file created");
    assert.ok(fs.existsSync(jsonPath), "JSON sidecar created");

    const sidecar = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.strictEqual(sidecar.id, hash);
    assert.strictEqual(sidecar.transcriptSnippet, "transcript here");
  });

  test("getAudio retrieves valid buffer", async () => {
    const dummyBuffer = Buffer.from("dummy audio content");
    const hash = await service.storeAudio(dummyBuffer);

    const retrieved = await service.getAudio(hash);
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved.toString(), "dummy audio content");
  });

  test("getAudio returns null for missing hash", async () => {
    const retrieved = await service.getAudio("invalidhash123");
    assert.strictEqual(retrieved, null);
  });
});
