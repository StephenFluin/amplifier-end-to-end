import * as fs from "fs";
import * as os from "os";
import { execSync } from "child_process";

const ampd_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.6.0/ampd-linux-amd64-v0.6.0",
  "darwin-amd64":
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.6.0/ampd-darwin-amd64-v0.6.0",
};
const axelard_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-linux-amd64-v0.35.6",
  "darwin-amd64":
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-darwin-amd64-v0.35.6",
};

/**
 * Download a binary from a given URL and symlink it to a desired name
 * Keeping both files. Download / sym link only as needed
 * Put everything in bin/ folder
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
  return downloadBinary(ampd_paths, "bin/ampd");
}

export function downloadAxelard(): Promise<void> {
  return downloadBinary(axelard_paths, "bin/axelard");
}

async function downloadBinary(
  paths: Record<string, string>,
  desiredName: string
): Promise<void> {
  let system = os.platform().toLowerCase();
  if (system === "darwin") {
    // amd64 for all macs intentionally
    system += "-" + "amd64";
  }
  console.log("system detected as", system);

  if (!(system in paths)) {
    console.error(`Unsupported system: ${system}`);
    process.exit(1);
  }

  const url = paths[system];
  const filename = "bin/" + url.split("/").pop();
  if (!filename) {
    console.error("Couldn't determine filename");
    process.exit(1);
  }

  if (
    fs.existsSync(filename) &&
    fs.existsSync(desiredName) &&
    fs.readlinkSync(desiredName) == filename.split("/").pop()
  ) {
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
    // Let's make sure we have a pointer from desiredname to filename (not bin/filename)
    const desiredFile = filename.split("/").pop() || "";
    if (!fs.existsSync(desiredName)) {
      fs.symlinkSync(desiredFile, desiredName);
      console.log(`'${desiredName}' symlink created`);
    } else if (fs.readlinkSync(desiredName) != desiredFile) {
      console.log("Updating symlink to point to", desiredFile);
      fs.unlinkSync(desiredName);
      fs.symlinkSync(desiredFile, desiredName);
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
      `Error running ${processName}. Command:\n${command}\nStdout:\n${error.stdout}\nStderr:\n${error.stderr}`
    );
    process.exit(1);
  }
}
