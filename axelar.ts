/**
 * Functions for integrating with the Axelar Network
 */

import { existsSync } from "fs";
import { run } from "./helpers";

export async function instantiateContracts() {
  compileContracts();
  const [verifierCodeId, gatewayCodeId, proverCodeId] = deployContracts();

  console.log("Determine wallet address");
  let address = run(
    "./axelard keys show wallet --keyring-backend=test",
    "show wallet address"
  ).match(/address: (.*)/)?.[1];

  if (!address) {
    console.log(
      "Error getting address from wallet. Please run `./axelard keys add wallet --keyring-backend test`, fund your wallet and try again."
    );
    process.exit(1);
  }
  let sourceChainGatewayAddress = "0xCa85f85C72df5f8428a440887CA7c449D94e0D0c"; // Ben to update when we do it dynamically

  console.log(
    "Instantiating verifier with",
    verifierCodeId,
    sourceChainGatewayAddress,
    address
  );
  const [verifierAddress, verifierCreation] = instantiate(
    "verifier",
    verifierCodeId,
    `{
    "governance_address": "axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9",
    "service_registry_address":"axelar1c9fkszt5lq34vvvlat3fxj6yv7ejtqapz04e97vtc9m5z9cwnamq8zjlhz",
    "service_name":"validators",
    "source_gateway_address":"${sourceChainGatewayAddress}",
    "voting_threshold":["1","1"],
    "block_expiry":10,
    "confirmation_height":1,
    "source_chain":"test",
    "rewards_address":"axelar1vaj9sfzc3z0gpel90wu4ljutncutv0wuhvvwfsh30rqxq422z89qnd989l",
    "msg_id_format":"hex_tx_hash_and_event_index"
}`,
    { address: address }
  );

  const [gatewayAddress, gatewayCreation] = instantiate(
    "gateway",
    gatewayCodeId,
    `{
    "verifier_address": "${verifierAddress}",
    "router_address": "axelar14jjdxqhuxk803e9pq64w4fgf385y86xxhkpzswe9crmu6vxycezst0zq8y"
}`,
    { address: address }
  );

  const chainId = "EndToEndTestChain";
  const [proverAddress, proverCreation] = instantiate(
    "prover",
    proverCodeId,
    `{
      "admin_address": "${address}",
      "governance_address": "axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9",
      "gateway_address": "${gatewayAddress}",
      "multisig_address": "axelar19jxy26z0qnnspa45y5nru0l5rmy9d637z5km2ndjxthfxf5qaswst9290r",
      "coordinator_address":"axelar1m2498n4h2tskcsmssjnzswl5e6eflmqnh487ds47yxyu6y5h4zuqr9zk4g",
      "service_registry_address":"axelar1c9fkszt5lq34vvvlat3fxj6yv7ejtqapz04e97vtc9m5z9cwnamq8zjlhz",
      "voting_verifier_address": "${verifierAddress}",
      "signing_threshold": ["1","1"],
      "service_name": "validators",
      "chain_name":"test",
      "verifier_set_diff_threshold": 1,
      "encoder": "abi",
      "key_type": "ecdsa",
      "domain_separator": "${randomHash()}"
  }`,
    { address: address }
  );
  console.log("Finished instantiating contracts");
  console.log("Verifier:", verifierAddress);
  console.log("Gateway:", gatewayAddress);
  console.log("Prover:", proverAddress);
}

function instantiate(
  contract: string,
  codeId: string,
  paramBlock: string,
  params: { address: string }
) {
  console.log("Instantiating", contract);
  const cmd = `./axelard tx wasm instantiate ${codeId} \
  '${paramBlock}' \
  --keyring-backend test \
  --from wallet \
  --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
  --chain-id devnet-amplifier \
  --node http://devnet-amplifier.axelar.dev:26657 \
  --label test-${contract} \
  --admin ${params["address"]}
`;
  console.log("About to run instantiate command:", cmd);
  const creation = run(cmd, `instantiating ${contract}`);
  const contractAdress = creation.match(
    /"key":"_contract_address","value":"(.*?)"/
  )?.[1];
  return [contractAdress, creation];
}
function randomHash() {
  const characters = "0123456789abcdef";
  let hash = "0x";

  for (let i = 0; i < 64; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    hash += characters[randomIndex];
  }

  return hash;
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
  console.log("Deploying", contract);
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
