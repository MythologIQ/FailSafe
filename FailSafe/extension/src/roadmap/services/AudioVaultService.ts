import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export class AudioVaultService {
  private vaultPath: string;

  constructor(workspaceRoot: string) {
    this.vaultPath = path.join(workspaceRoot, ".failsafe", "audio");
  }

  async init(): Promise<void> {
    if (!fs.existsSync(this.vaultPath)) {
      await fs.promises.mkdir(this.vaultPath, { recursive: true });
    }
  }

  async storeAudio(
    audioData: Buffer,
    transcript: string = "",
  ): Promise<string> {
    const hash = crypto
      .createHash("sha256")
      .update(audioData)
      .update(Date.now().toString())
      .digest("hex");

    const webmPath = path.join(this.vaultPath, `${hash}.webm`);
    const sidecarPath = path.join(this.vaultPath, `${hash}.json`);

    const metadata = {
      id: hash,
      timestamp: new Date().toISOString(),
      transcriptSnippet: transcript.slice(0, 100),
    };

    await fs.promises.writeFile(webmPath, audioData);
    await fs.promises.writeFile(
      sidecarPath,
      JSON.stringify(metadata, null, 2),
      "utf8",
    );

    return hash;
  }

  async getAudio(hash: string): Promise<Buffer | null> {
    const webmPath = path.join(this.vaultPath, `${hash}.webm`);
    try {
      return await fs.promises.readFile(webmPath);
    } catch {
      return null;
    }
  }
}
