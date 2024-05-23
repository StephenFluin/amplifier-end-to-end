import { spawn, execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import axios from "axios"; // Use axios for HTTP requests in TypeScript

const tofnd = "haiyizxx/tofnd:latest";
const ampd_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-linux-amd64-v0.1.0",
  "darwin-i386":
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-amd64-v0.1.0",
  "darwin-arm64":
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v0.1.0/ampd-darwin-arm64-v0.1.0",
};
const axelard_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-linux-amd64-v0.35.6",
  "darwin-i386":
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-darwin-amd64-v0.35.6",
  "darwin-arm64":
    "https://github.com/axelarnetwork/axelar-core/releases/download/v0.35.6/axelard-darwin-arm64-v0.35.6",
};

let verbose = false;

if (verbose) {
  console.log("Using verbose mode");
}

function checkDockerInstalled(): void {
  try {
    execSync("docker --version"); // Use execSync for synchronous execution
    console.log("Docker is installed.");
  } catch (error) {
    console.log("Docker is not installed.");
    console.log(
      "Please follow the installation instructions at: https://docs.docker.com/get-docker/"
    );
    process.exit(1);
  }
}

async function runTofnd(): Promise<void> {
  stopAllDockers();

  try {
    execSync("docker pull " + tofnd); // Pull the docker image

    console.log("Pulled docker image:", tofnd);

    const tofndProcess = spawn(
      "docker",
      [
        "run",
        "-p",
        "50051:50051",
        "--env",
        "MNEMONIC_CMD=auto",
        "--env",
        "NOPASSWORD=true",
        "-v",
        "tofnd:/.tofnd",
        tofnd,
      ],
      { detached: true }
    );

    let output = ""; // Store the accumulated output

    return new Promise((resolve, reject) => {
      // Event listeners for output from the child process
      tofndProcess.stdout.on("data", (data) => {
        output += data.toString();
        if (verbose) {
          console.log(data.toString().trim());
        }
        if (output.includes("tofnd listen addr 0.0.0.0:50051")) {
          console.log("tofnd is ready");
          resolve();
        }
      });

      tofndProcess.stderr.on("data", (data) => {
        console.error(`Error: ${data}`);
        reject();
      });

      // Error handling for the child process
      tofndProcess.on("close", (code) => {
        if (code !== 0 || !output.includes("tofnd listen addr 0.0.0.0:50051")) {
          console.error("Error executing Docker commands. Exit code:", code);
          reject();
          process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error("Error executing Docker commands:", error);
    process.exit(1);
  }
}

function stopAllDockers(): void {
  try {
    const instance = execSync(
      `docker ps -q --filter ancestor=${tofnd}`,
      { encoding: "utf-8" } // Ensure output is a string
    ).trim(); // Remove any extra whitespace

    if (instance.length === 0) {
      // No running docker instances found
      return;
    }

    console.log("Stopping and removing docker instance:", instance);

    execSync(`docker stop ${instance}`);
    execSync(`docker remove ${instance}`);
  } catch (error) {
    console.error("Error stopping/removing docker instances:", error);
    // Potentially add more specific error handling here based on
    // the types of errors you expect from docker commands.
  }
}

function downloadAmpd(): Promise<void> {
  return downloadBinary(ampd_paths, "ampd");
}

function downloadAxelard(): Promise<void> {
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

  if (fs.existsSync(filename)) {
    console.log(`${desiredName} already exists, not downloading`);
    return;
  }

  console.log(`Downloading ${filename} from ${url}`);

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" }); // Get binary data
    fs.writeFileSync(filename, response.data);

    console.log(`Downloaded ${filename}`);

    fs.chmodSync(filename, 0o755); // Set file permissions

    if (!fs.existsSync(desiredName)) {
      fs.symlinkSync(filename, desiredName); // Create symlink
      console.log(`'${desiredName}' symlink created`);
    }
  } catch (error) {
    console.error(`Error downloading ${filename}:`, error);
    process.exit(1);
  }
}

function configureAmpd(): void {
  const configFilePath = "devnet-verifiers-config.toml";
  const destinationDir = path.join(os.homedir(), ".ampd");
  const destinationPath = path.join(destinationDir, "config.toml");

  if (!fs.existsSync(configFilePath)) {
    console.error("Error: devnet-verifiers-config.toml not found.");
    process.exit(1);
  }

  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir);
  }

  if (fs.existsSync(destinationPath)) {
    console.log(
      "Not rewriting config.toml: ~/.ampd/config.toml already exists."
    );
  } else {
    fs.copyFileSync(configFilePath, destinationPath);
    console.log("Copied devnet-verifiers-config.toml to ~/.ampd/config.toml");
  }
}

function printWorkerAddress(): void {
  const output = run("./ampd worker-address", "get worker address"); // Assuming ampd is in the current directory
  const workerAddress = /worker address: (.*)/.exec(output)?.[1];
  if (!workerAddress) {
    console.log("Error getting worker address");
    process.exit(1);
  }

  console.log(`Your worker address is ${workerAddress}.`);

  const balance = checkWalletBalance(workerAddress);

  if (balance != "0") {
    console.log(
      `You already have ${balance} tokens in your wallet, no need to fund it.`
    );
    return;
  }

  console.log(
    "Visit https://discord.com/channels/770814806105128977/1002423218772136056/1217885883152334918 and fund this wallet with:"
  );
  console.log(`!faucet devnet-verifiers ${workerAddress}`);
  console.log(
    "You will need this to continue, so please fund your wallet before proceeding."
  );
}

function checkWalletBalance(address: string): string {
  const output = run(
    `axelard q bank balances ${address} --node http://devnet-verifiers.axelar.dev:26657`,
    "fetching balance"
  );

  const matches = output.match(/amount: "(\d+)"/);
  if (matches && matches[1]) {
    return matches[1];
  } else {
    return "unknown";
  }
}

function bondAndRegister(): void {
  run(
    "./ampd --config devnet-verifiers-config.toml bond-worker validators 100 uverifiers",
    "bonding worker"
  );

  /**
   * This one is more complicated because errors are OK, we just have to
   * check if this is an expected error (key registered already), or unexpected
   */
  let registerResult;
  try {
    registerResult = execSync("./ampd register-public-key", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("Registered public key.");
  } catch (error: any) {
    if (error.stdout.match(/public key is already registered/)) {
      console.log("Public key already registered");
    } else {
      console.error(
        "Unknown error registering public key.",
        error.stdout,
        "Error included:",
        error.stderr
      );
    }
  }
  run(
    "./ampd register-chain-support validators avalanche",
    "register support for avalanche"
  );
  run(
    "./ampd register-chain-support validators fantom",
    "register support for fantom"
  );
  console.log("Support for avalanche and fantom registered");
}

/**
 * Helper method that runs using execSync and reports errors and exits on failure
 */
function run(command: string, processName: string): string {
  try {
    return execSync(command, { encoding: "utf-8" });
  } catch (error: any) {
    console.error(
      `Error running ${processName}. Stdout:\n${error.stdout}\nStderr:\n${error.stderr}`
    );
    process.exit(1);
  }
}

async function verifier() {
  checkDockerInstalled();
  await runTofnd();
  downloadAmpd();
  configureAmpd();
  downloadAxelard();
  printWorkerAddress();
  bondAndRegister();
  console.log("Finished setting up verifier");
  console.log("Now fill out the form here:");
  console.log(
    "https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform"
  );
}

verifier()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
