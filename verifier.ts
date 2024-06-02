import {
  spawn,
  execSync,
  spawnSync,
  ChildProcessWithoutNullStreams,
} from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { run } from "./helpers";

const tofnd = "haiyizxx/tofnd:latest";

let verbose = true;

if (verbose) {
  console.log("Using verbose mode");
}

export function checkDockerInstalled(): void {
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

export async function runTofnd() {
  const instance = run(
    `docker ps -q --filter ancestor=${tofnd}`,
    "docker process query"
  );

  // If tofnd is already running, don't start another instance unless the user asks for it
  const clearFlag = process.argv.indexOf("--clear") === -1 ? false : true;
  if (instance && !clearFlag) {
    console.log("tofnd is already running");
    return;
  }
  if (clearFlag) {
    stopAllDockers(instance);
  }

  let tofndProcess: ChildProcessWithoutNullStreams;
  try {
    execSync("docker pull " + tofnd); // Pull the docker image

    console.log("Pulled docker image:", tofnd);

    tofndProcess = spawn(
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
  } catch (error) {
    console.error("Error executing Docker commands:", error);
    // process.exit(1);
  }
  console.log("tofnd started");

  let output = ""; // Store the accumulated output

  return new Promise<void>((resolve, reject) => {
    // Event listeners for output from the child process
    tofndProcess.stdout.on("data", (data: any) => {
      output += data.toString();

      if (output.includes("tofnd listen addr 0.0.0.0:50051")) {
        console.log("tofnd is ready");
        resolve();
      }
    });

    tofndProcess.stderr.on("data", (data: any) => {
      console.error("Error from tofnd:", data.toString().trim());
    });

    tofndProcess.on("error", (error: any) => {
      console.log("unknown error in tofnd", error);
    });

    // Error handling for the child process
    tofndProcess.on("close", (code: number) => {
      console.log("tofnd exited with code", code);
      if (code !== 0 || !output.includes("tofnd listen addr 0.0.0.0:50051")) {
        console.error("Error executing Docker commands. Exit code:", code);
        reject();
        process.exit(1);
      } else {
        console.error("tofnd exited with code 0 for some reason?!");
      }
    });
    console.debug("done defining promise");
  });
}

function stopAllDockers(instance: string): void {
  try {
    if (instance.length === 0) {
      // No running docker instances found
      console.log("No running docker instances found.");
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

export function configureAmpd(network: string): void {
  const configFilePath = `devnet-${network}-config.toml`;
  const destinationDir = path.join(os.homedir(), ".ampd");
  const destinationPath = path.join(destinationDir, "config.toml");

  if (!fs.existsSync(configFilePath)) {
    console.error(`Error: ${configFilePath} not found.`);
    process.exit(1);
  }

  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir);
  }

  // Always copy as there might be updates
  fs.copyFileSync(configFilePath, destinationPath);
  console.log("Copied devnet-verifiers-config.toml to ~/.ampd/config.toml");
}

export function printVerifierAddress(network: string): void {
  const output = run("./ampd verifier-address", "get verifier address"); // Assuming ampd is in the current directory
  const verifierAddress = /verifier address: (.*)/.exec(output)?.[1];
  if (!verifierAddress) {
    console.log("Error getting verifier address");
    process.exit(1);
  }

  console.log(`Your verifier address is ${verifierAddress}.`);

  const balance = checkWalletBalance(verifierAddress, network);

  if (balance != "0" && balance != "unknown") {
    console.log(
      `You already have ${balance} tokens in your wallet on devnet-${network}, no need to fund it.`
    );
    return;
  }

  console.log(
    "Visit https://discord.com/channels/770814806105128977/1002423218772136056/1217885883152334918 and fund this wallet with:"
  );
  console.log(`!faucet devnet-${network} ${verifierAddress}`);
  console.log(
    "You will need this to continue, so please fund your wallet before proceeding."
  );
  process.exit(1);
}

function checkWalletBalance(address: string, network: string): string {
  const output = run(
    `./axelard q bank balances ${address} --node http://devnet-${network}.axelar.dev:26657`,
    "fetching balance"
  );

  const matches = output.match(/amount: "(\d+)"/);
  if (matches && matches[1]) {
    return matches[1];
  } else {
    return "unknown";
  }
}

export function bondAndRegister(network: string): void {
  run(
    `./ampd --config devnet-${network}-config.toml bond-verifier validators 100 u${network}`,
    "bonding verifier"
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
