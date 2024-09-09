/**
 * Functions for integrating with the Axelar Network
 */

import { existsSync } from "fs";
import { run } from "./helpers";
import { deployGatewayOnSepolia } from "./source";
import * as source from "./source";
import { getConfig } from "./configs/amplifier-deployments";
import pc from "picocolors";

/**
 *
 * @param srcGatewayAddress The source chain gateway address
 */
export async function instantiateContracts(
  srcGatewayAddress: string,
  options: any
): Promise<[string, string, string]> {
  const chainName = options.chainName;
  const config = await getConfig(options.network);

  compileContracts();
  const [verifierCodeId, gatewayCodeId, proverCodeId] = deployContracts();

  console.log("Determine wallet address");
  let address = run(
    "bin/axelard keys show wallet --keyring-backend=test",
    "show wallet address"
  ).match(/address: (.*)/)?.[1];

  if (!address) {
    console.log(
      pc.red("Error") +
        " getting address from wallet. Please run `bin/axelard keys add wallet --keyring-backend test`, fund your wallet and try again."
    );
    process.exit(1);
  }
  let sourceChainGatewayAddress = srcGatewayAddress;

  console.log(
    "Instantiating verifier with",
    verifierCodeId,
    sourceChainGatewayAddress,
    address
  );
  const [verifierAddress, verifierCreation] = instantiate(
    options,
    "verifier",
    verifierCodeId,
    `{
    "governance_address": "axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9",
    "service_registry_address":"${config.axelar.contracts.ServiceRegistry.address}",
    "service_name":"validators",
    "source_gateway_address":"${sourceChainGatewayAddress}",
    "voting_threshold":["1","1"],
    "block_expiry":"10",
    "confirmation_height":1,
    "source_chain":"${chainName}",
    "rewards_address":"${config.axelar.contracts.Rewards.address}",
    "msg_id_format":"hex_tx_hash_and_event_index",
    "address_format": "eip55"
}`,
    { address: address }
  );
  const [gatewayAddress, gatewayCreation] = instantiate(
    options,
    "gateway",
    gatewayCodeId,
    `{
    "verifier_address": "${verifierAddress}",
    "router_address": "${config.axelar.contracts.Router.address}"
}`,
    { address: address }
  );

  const [proverAddress, proverCreation] = instantiate(
    options,
    "prover",
    proverCodeId,
    `{
      "admin_address": "${address}",
      "governance_address": "${
        config.axelar.contracts.Multisig.governanceAddress
      }",
      "gateway_address": "${gatewayAddress}",
      "multisig_address": "${config.axelar.contracts.Multisig.address}",
      "coordinator_address":"${config.axelar.contracts.Coordinator.address}",
      "service_registry_address":"${
        config.axelar.contracts.ServiceRegistry.address
      }",
      "voting_verifier_address": "${verifierAddress}",
      "signing_threshold": ["1","1"],
      "service_name": "validators",
      "chain_name":"${chainName}",
      "verifier_set_diff_threshold": 1,
      "encoder": "abi",
      "key_type": "ecdsa",
      "domain_separator": "${randomHash()}"
  }`,
    { address: address }
  );
  console.log("Finished instantiating contracts");
  console.log("Chain Name:", pc.green(chainName));
  console.log("Verifier:", pc.green(verifierAddress));
  console.log("Gateway:", pc.green(gatewayAddress));
  console.log("Prover:", pc.green(proverAddress));
  return [verifierAddress, gatewayAddress, proverAddress];
}

function instantiate(
  options: any,
  contract: string,
  codeId: string,
  paramBlock: string,
  params: { address: string }
): [string, string] {
  console.log("Instantiating", contract);
  const cmd = `bin/axelard tx wasm instantiate ${codeId} \
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
  const contractAddress =
    creation.match(/"key":"_contract_address","value":"(.*?)"/)?.[1] ||
    "ERROR UNKNOWN ADDRESS";

  return [contractAddress, creation];
}
function randomHash() {
  let numbers: number[] = [];

  for (let i = 0; i < 32; i++) {
    numbers.push(Math.floor(Math.random() * 256));
  }

  // @TODO don't hard this
  return `856AAA4D78E06EA2E4B82705A350AD1CABEE7A7F7669F1C48199D27879818F84`;
}
function compileContracts() {
  console.log("Downloading CosmWasm contracts from axelar-amplifier via git");

  if (!existsSync("axelar-amplifier")) {
    run(
      "git clone https://github.com/axelarnetwork/axelar-amplifier",
      "clone repo"
    );
  }
  run(
    `cd axelar-amplifier;
    git fetch;
    git -c advice.detachedHead=false checkout ampd-v1.0.0`,
    "checkout ampd"
  );
  if (
    existsSync("axelar-amplifier/artifacts/voting_verifier.wasm") &&
    existsSync("axelar-amplifier/artifacts/gateway.wasm") &&
    existsSync("axelar-amplifier/artifacts/multisig_prover.wasm")
  ) {
    console.log(
      "Skipping compilation, artifacts already exists. To update add '--clear'"
    );
    return;
  }
  console.log("Compiling all contracts, this can take several minutes...");
  run(
    `cd axelar-amplifier;docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/optimizer:0.16.0
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
    `bin/axelard tx wasm store axelar-amplifier/artifacts/${contract}.wasm \
    --keyring-backend test \
    --from wallet \
    --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    --chain-id devnet-amplifier \
    --node http://devnet-amplifier.axelar.dev:26657`,
    `deploy ${contract}`
  );
  let codeId = output.match(/code_id","value":"(\d+)"/)?.[1];
  if (!codeId) {
    console.log(
      pc.red("ERROR") + " deploying, couldn't find codeId:\n" + output
    );
    process.exit(1);
  }
  return codeId;
}
/**
 * Propagate changes in verifiers out to the destination chain
 */
export async function rotateVerifierSet() {
  // Call UpdateVerifierSet on Multisig Prover of target chain
  // axelard tx wasm execute axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2 '"update_verifier_set"'     --keyring-backend test     --from wallet     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier   --node http://devnet-verifiers.axelar.dev:26657
  // axelard tx wasm execute axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2 '"update_verifier_set"' --from=amplifier --gas auto --gas-adjustment 1.5 --gas-prices 0.007uverifiers
  // ^^^^ requires admin now (or governance)

  // axelard q wasm contract-state smart axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2 '{"get_proof":{"multisig_session_id":"16"}}' --node http://devnet-verifiers.axelar.dev:26657

  // Look for wasm-proof_under_construction event's sessionId
  source.rotateSigners(getVerifierSetProof());
}
export async function supplyRewards(options: {
  network: string;
  [key: string]: any;
}) {
  const config = await getConfig(options.network);
  console.log("Supplying rewards to 2 pools");
  const rewards = config.axelar.contracts.Rewards.address;

  const reward = (contract: string) => {
    const cmd = ``;
    run(
      `axelard tx wasm execute ${rewards} \
    '{
        "add_rewards":
            {
                "pool_id":
                    {
                        "chain_name":"${options.chainName}",
                        "contract":"${contract}"
                    }
            }
    }' \
    --amount 100${config.axelar.contracts.Rewards.rewardsDenom} \
    --chain-id ${options.network} \
    --keyring-backend test \
    --from wallet \
    --gas auto --gas-adjustment 1.5 --gas-prices ${config.axelar.gasPrice} \
    --node ${config.axelar.rpc}`,
      "supply rewards to pool"
    );
  };
  reward(options.verifier);
  reward(options.prover);
}
export function verifyMessages() {
  const gateway =
    "axelar17llq4ch6xwwmmpz2uc0qgyqs0mruhd5888a49n50z79q3cdrceushfjq3h";
  const chainName = "ethereum-sepolia";
  const tx =
    "0xc9eb0d116e1f79511f039cc58a3a531f72e704bc18a46d370de160941372bcc3";
  const source = "0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA";
  const destination = "avalanche";
  const destinationAddress = "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4";
  const payloadHash =
    "5878734D26F288FD562CE12A277687B6243EE46B53E9DB5DF881C2D9A4DC077A";
  const logIndex = "157";

  // Example tx:
  // 0xc9eb0d116e1f79511f039cc58a3a531f72e704bc18a46d370de160941372bcc3
  const cmd = `bin/axelard tx wasm execute ${gateway} \
    '{"verify_messages":
      [{"cc_id":{
        "chain":"${chainName}",
        "id":"${tx}-${logIndex}"},
        "destination_chain":"${destination}",
        "destination_address":"${destinationAddress}",
        "source_address":"${source}",
        "payload_hash":"${payloadHash}"}]
    }' \
  --keyring-backend test \
  --from wallet \
  --gas auto --gas-adjustment 1.5 \
  --gas-prices 0.007uverifiers \
      --node http://devnet-verifiers.axelar.dev:26657
`;
  console.log(cmd);
  const result = run(cmd, "Trigger message verification on the Axelar Network");
  console.log("transaction successful with", result);
}
export function routeMessages() {}
export function constructProof() {}
export function distributeRewards() {}
export function getVerifierSetProof() {}
export function getMessageProof() {}
