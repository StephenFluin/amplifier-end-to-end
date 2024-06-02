/**
 * Functions for integrating with the Axelar Network
 */

import { run } from "./helpers";

export async function instantiateContracts() {
  await compileContracts();
  const [verifier, gateway, prover] = await deployContracts();
  instantiateCodeId(verifier, "");
  instantiateCodeId(gateway, "");
  instantiateCodeId(prover, "");
}
async function compileContracts() {
  console.log("Downloading CosmWasm contracts from axelar-amplifier via git");
  run(
    `rm -rf axelar-amplifier;
    git clone https://github.com/axelarnetwork/axelar-amplifier;
    cd axelar-amplifier;
    git -c advice.detachedHead=false checkout ampd-v0.4.0`,
    "checkout ampd"
  );
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
async function deployContracts(): Promise<[string, string, string]> {
  let deployment = run(
    `axelard tx wasm store artifacts/voting_verifier.wasm \
    --keyring-backend test \
    --from wallet \
    --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    --chain-id devnet-amplifier \
    --node http://devnet-amplifier.axelar.dev:26657`,
    "deploy verifier"
  );

  return ["0", "0", "0"];
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
