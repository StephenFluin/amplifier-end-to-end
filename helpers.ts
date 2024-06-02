import * as fs from "fs";
import * as os from "os";
import { execSync } from "child_process";

const ampd_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.4.0/ampd-linux-amd64-v0.4.0",
  "darwin-i386":
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-amd64-v0.4.0",
  "darwin-arm64":
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.4.0/ampd-darwin-arm64-v0.4.0",
};
const axelard_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-linux-amd64-v0.35.6",
  "darwin-i386":
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-darwin-amd64-v0.35.6",
  "darwin-arm64":
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-darwin-arm64-v0.35.6",
};

/**
 * Download a binary from a given URL and symlink it to a desired name
 * Keeping both files. Download / sym link only as needed
 */
export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Check if the request was successful
      throw new Error(
        `Error downloading file: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer(); // Get binary data
    fs.writeFileSync(filename, Buffer.from(arrayBuffer)); // Write to file

    console.log(`File downloaded successfully: ${filename}`);
  } catch (error) {
    console.error("Download error:", error);
  }
}

export function downloadAmpd(): Promise<void> {
  return downloadBinary(ampd_paths, "ampd");
}

export function downloadAxelard(): Promise<void> {
  return downloadBinary(axelard_paths, "axelard");
}

async function downloadBinary(
  paths: Record<string, string>,
  desiredName: string
): Promise<void> {
  let system = os.platform().toLowerCase();
  if (system === "darwin") {
    system += "-" + os.arch().toLowerCase();
  }
  console.log("system detected as", system);

  if (!(system in paths)) {
    console.error(`Unsupported system: ${system}`);
    process.exit(1);
  }

  const url = paths[system];
  const filename = url.split("/").pop();
  if (!filename) {
    console.error("Couldn't determine filename");
    process.exit(1);
  }

  if (fs.existsSync(filename) && fs.readlinkSync(desiredName) == filename) {
    console.log(`${filename} already exists, not downloading`);
  } else {
    console.log(`Downloading ${filename} from ${url}`);
    try {
      await downloadFile(url, filename);
      console.log("file written to filesystem");
      fs.chmodSync(filename, 0o755); // Make it executable
    } catch (error) {
      console.error(`Error downloading ${filename}:`, error);
      process.exit(1);
    }
  }
  try {
    if (!fs.existsSync(desiredName)) {
      fs.symlinkSync(filename, desiredName);
      console.log(`'${desiredName}' symlink created`);
    } else if (fs.readlinkSync(desiredName) != filename) {
      console.log("Updating symlink to point to", filename);
      fs.unlinkSync(desiredName);
      fs.symlinkSync(filename, desiredName);
    }
  } catch (error) {
    console.error(`Error sym linking ${filename} to ${desiredName}:`, error);
    process.exit(1);
  }
}

/**
 * Helper method that runs using execSync and reports errors and exits on failure
 */
export function run(command: string, processName: string): string {
  try {
    return execSync(command, { encoding: "utf-8" });
  } catch (error: any) {
    console.error(
      `Error running ${processName}. Stdout:\n${error.stdout}\nStderr:\n${error.stderr}`
    );
    process.exit(1);
  }
}
