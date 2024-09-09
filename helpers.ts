import * as fs from "fs";
import * as os from "os";
import { execSync } from "child_process";
import { getConfig } from "./configs/amplifier-deployments";
import ProgressBar from "progress";

const ampd_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v1.0.0/ampd-linux-amd64-v1.0.0",
  "darwin-amd64":
    "https://github.com/axelarnetwork/axelar-amplifier/releases/download/ampd-v1.0.0/ampd-darwin-amd64-v1.0.0",
};
const axelard_paths = {
  linux:
    "https://github.com/axelarnetwork/axelar-core/releases/download/v1.0.1/axelard-linux-amd64-v1.0.1",
  "darwin-amd64":
    "https://github.com/axelarnetwork/axelar-core/releases/download/v1.0.1/axelard-darwin-amd64-v1.0.1",
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
  //console.log("system detected as", system);

  if (!(system in paths)) {
    console.error(`Unsupported system: ${system}`);
    process.exit(1);
  }
  // Ensure bin folder exist
  if (!fs.existsSync("bin")) {
    fs.mkdirSync("bin");
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
    // console.log(`${filename} already exists, not downloading`);
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
export function run(
  command: string,
  processName: string,
  options: { fake?: boolean; allowErrors?: boolean } = {}
): string {
  try {
    if (!options.fake) {
      return execSync(command, { encoding: "utf-8" });
    } else {
      console.log("Would run:\n", command);
      return "faked";
    }
  } catch (error: any) {
    if (options.allowErrors !== true) {
      console.error(
        `Error running ${processName}. Command:\n${command}\nStdout:\n${error.stdout}\nStderr:\n${error.stderr}`
      );
      process.exit(1);
    } else {
      throw error;
    }
  }
}

export function getTxHashFromCast(output: string): string {
  return (output.match(/transactionHash\s*(0x[a-zA-Z0-9]*)/) || [
    ,
    "Unknown Tx Hash",
  ])[1];
}

export function getSessionIdFromCommand(output: string): string {
  // Find the number in {"key":"session_id","value":"3463"} with regular expressions
  const sessionId = output.match(/"session_id","value":"(\d+)"/)![1];
  return sessionId;
}

export function getProofExecuteData(
  prover: string,
  multisigSessionId: string,
  rpc: string
): string {
  const proofData = run(
    `axelard q wasm contract-state smart ${prover} \
     '{"proof":{"multisig_session_id":"${multisigSessionId}"}}' \
      --node ${rpc}`,
    "get proof"
  );
  const hexData = proofData.match(/execute_data: (.*)/)![1];
  console.log("hex to execute is", hexData.length, "long");
  return hexData;
}
/**
 * Take in an axelar verifyMessages transaction and return poll and contract.
 */
export function getPollFromVerifyMessages(output: string): string {
  let event;
  try {
    event = JSON.parse(output).logs[0].events.find(
      (event: any) => event.type === "wasm-messages_poll_started"
    );
  } catch (error: any) {
    console.log("error getting poll from verify messages", error, output);
    return "";
  }
  const pollId = event.attributes
    .find((attribute: any) => attribute.key === "poll_id")
    .value.replace(/"/g, "");
  return pollId;
}

export function getVersionFromNetwork(network: string): string {
  if (network === "testnet") {
    return "1.0";
  }
  return "0.6";
}

export async function verifyMessages(
  network: string = "devnet-verifiers",
  sourceChain: string,
  transactionHash: string,
  transactionIndex: number = 0,
  destinationChain: string,
  destinationAddress: string,
  sourceAddress: string,
  payloadHash: string
) {
  const config = await getConfig(network);

  const version = getVersionFromNetwork(network);
  const cmd = `bin/axelard tx wasm execute ${
    config.axelar.contracts.Gateway[sourceChain].address
  } \
  '{"verify_messages":
      [{"cc_id":{
        "${version === "1.0" ? "source_" : ""}chain":"${sourceChain}",
        "${
          version === "1.0" ? "message_" : ""
        }id":"${transactionHash}-${transactionIndex}"},
        "destination_chain":"${destinationChain}",
        "destination_address":"${destinationAddress}",
        "source_address":"${sourceAddress}",
        "payload_hash":"${payloadHash}"}]
    }' \
  --keyring-backend test \
  --from wallet \
  --gas auto --gas-adjustment 1.5 \
  --gas-prices ${config.axelar.gasPrice} \
  --chain-id=${config.axelar.chainId} \
  --node ${config.axelar.rpc}`;
  console.log("running cmd:", cmd);
  return run(cmd, "relay the message to the Axelar network");
}

export async function sleep(ms: number) {
  if (!ms && ms !== 0) {
    console.log("invalid wait provided!");
    return;
  }
  return new Promise((resolve) => {
    const bar = new ProgressBar("Waiting [:bar] :percent :etas", {
      total: ms / 100,
    });
    const timer = setInterval(() => {
      bar.tick();
      if (bar.complete) {
        clearInterval(timer);
        resolve(true);
      }
    }, 100);
  });
}

export async function endPoll(options: any) {
  const config = await getConfig(options.network);
  const cmd = `axelard tx wasm execute ${options.contract} \
  '{"end_poll":{"poll_id":"${options.poll}"}}' \
  --from wallet --keyring-backend test --gas auto --gas-adjustment 1.5 --gas-prices ${config.axelar.gasPrice} \
  --node ${config.axelar.rpc}`;
  console.log("running", cmd);
  run(cmd, "end the poll");
}
