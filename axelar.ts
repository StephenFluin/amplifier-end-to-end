/**
 * Functions for integrating with the Axelar Network
 */

import { exists, existsSync } from "fs";
import { run } from "./helpers";

export async function instantiateContracts() {
  compileContracts();
  const [verifier, gateway, prover] = deployContracts();

  console.log("Determine wallet address");
  let address = run(
    "./axelard keys show wallet --keyring-backend=test",
    "show wallet address"
  ).match(/address: (.*)/)?.[1];
  let gatewayAddress = "0xCa85f85C72df5f8428a440887CA7c449D94e0D0c";

  console.log("Instantiating verifier with", verifier, gatewayAddress, address);
  const verifierCreation = run(
    `axelard tx wasm instantiate ${verifier} \
  '{
      "governance_address": "axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9",
      "service_registry_address":"axelar1c9fkszt5lq34vvvlat3fxj6yv7ejtqapz04e97vtc9m5z9cwnamq8zjlhz",
      "service_name":"validators",
      "source_gateway_address":"${gatewayAddress}",
      "voting_threshold":["1","1"],
      "block_expiry":10,
      "confirmation_height":1,
      "source_chain":"test",
      "rewards_address":"axelar1vaj9sfzc3z0gpel90wu4ljutncutv0wuhvvwfsh30rqxq422z89qnd989l"
  }' \
  --keyring-backend test \
  --from wallet \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
  --chain-id devnet-amplifier \
  --node http://devnet-amplifier.axelar.dev:26657 \
  --label test-voting-verifier \
  --admin ${address}
`,
    "deploy verifier"
  );

  console.log("full output of verifier creation", verifierCreation);

  console.log("Instantiating verifier.");
  console.log("Instantiating gateway.");
  console.log("Instantiating prover.");
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

export function updateWorkerSet() {}
export function supplyRewards() {}
export function verifyMessages() {}
export function routeMessages() {}
export function constructProof() {}
export function distributeRewards() {}
export function getWorkerSetProof() {}
export function getMessageProof() {}
