/**
 * Functions for integrating with the Axelar Network
 */

import { exists, existsSync } from "fs";
import { run } from "./helpers";

export async function instantiateContracts() {
  compileContracts();
  const [verifier, gateway, prover] = deployContracts();
  instantiateCodeId(verifier, "");
  instantiateCodeId(gateway, "");
  instantiateCodeId(prover, "");
}
function compileContracts() {
  console.log("Downloading CosmWasm contracts from axelar-amplifier via git");

  const clearFlag = process.argv.indexOf("--clear") === -1 ? false : true;
  if (clearFlag) {
    run("rm -rf axelar-amplifier", "remove and replace old repo");
  }
  if (!existsSync("axelar-amplifier")) {
    run(
      "git clone https://github.com/axelarnetwork/axelar-amplifier",
      "clone repo"
    );
  }
  run(
    `cd axelar-amplifier;
    git -c advice.detachedHead=false checkout ampd-v0.4.0`,
    "checkout ampd"
  );
  if (
    existsSync("axelar-amplifier/artifacts/voting_verifier.wasm") &&
    existsSync("axelar-amplifier/artifacts/gateway.wasm") &&
    existsSync("axelar-amplifier/artifacts/multisig_prover.wasm") &&
    !clearFlag
  ) {
    console.log(
      "Skipping compilation, artifacts already exists. To update add '-- --clear'"
    );
    return;
  }
  console.log("Compiling all contracts, this can take several minutes...");
  run(
    `cd axelar-amplifier;docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/optimizer:0.15.1
  `,
    "Compile contracts"
  );
  console.log("Done compiling contracts");
}
/**
 *
 * @returns Functions here are 1:1 from docs, with 1 extra cd;
 */
function deployContracts(): [string, string, string] {
  let verifierCodeId = deployContract("voting_verifier");
  let gatewayCodeId = deployContract("gateway");
  let proverCodeId = deployContract("multisig_prover");

  console.log(
    "Contract deployments done, code ids are: ",
    verifierCodeId,
    gatewayCodeId,
    proverCodeId
  );

  return [verifierCodeId, gatewayCodeId, proverCodeId];
}

function deployContract(contract: string) {
  const output = run(
    `./axelard tx wasm store axelar-amplifier/artifacts/${contract}.wasm \
    --keyring-backend test \
    --from wallet \
    --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    --chain-id devnet-amplifier \
    --node http://devnet-amplifier.axelar.dev:26657`,
    `deploy ${contract}`
  );
  let codeId = output.match(/code_id","value":"(\d+)"/)?.[1];
  if (!codeId) {
    console.log("ERROR deploying, couldn't find codeId:\n" + output);
    process.exit(1);
  }
  return codeId;
}
async function instantiateCodeId(id: string, params: string) {}

export function updateWorkerSet() {}
export function supplyRewards() {}
export function verifyMessages() {}
export function routeMessages() {}
export function constructProof() {}
export function distributeRewards() {}
export function getWorkerSetProof() {}
export function getMessageProof() {}
