import { run } from "./helpers";
export async function registerChainViaGovernance() {
  // Submit proposals
  run(
    `export ROUTER_CONTRACT_ADDRESS="axelar14jjdxqhuxk803e9pq64w4fgf385y86xxhkpzswe9crmu6vxycezst0zq8y"
    export MY_GATEWAY_CONTRACT_ADDRESS="axelar16k4fc9x77sqjehnzttckpv3dhpqn7la8d292kjrmjhaua836gwjqn08ack"
  axelard tx gov submit-proposal execute-contract \
      $ROUTER_CONTRACT_ADDRESS \
      '{"register_chain":
          {
              "chain":"devrel-testchain-0001",
              "gateway_address":"$MY_GATEWAY_CONTRACT_ADDRESS",
              "msg_id_format":"hex_tx_hash_and_event_index"
          }
      }' \
    --run-as axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9 --deposit=100000000uamplifier --title="Add devrel integration (gateway) 0001" --description="testing" --amount=100000000uamplifier \
    --chain-id=devnet-amplifier \
    --keyring-backend test --from wallet --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier --node=http://devnet-amplifier.axelar.dev:26657`,
    "propose a new chain integration"
  );
  run(
    `
    export MY_PROVER_CONTRACT_ADDRESS="axelar12kmaddcd9puv3qdflhaj5zhy4wkm3rwmce6uxh7x29ff33phcl3sm62tm3"
    export AMPLIFIER_MULTISIG_CONTRACT_ADDRESS="axelar19jxy26z0qnnspa45y5nru0l5rmy9d637z5km2ndjxthfxf5qaswst9290r"
    axelard tx wasm execute $AMPLIFIER_MULTISIG_CONTRACT_ADDRESS \
    '{"authorize_caller":
        {"contract_address":"$MY_PROVER_CONTRACT_ADDRESS"}}' \
      --run-as axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9 --deposit=100000000uamplifier --title="Add devrel integration (prover) 0001" --description="testing" --amount=100000000uamplifier \
      --chain-id=devnet-amplifier \
      --keyring-backend test --from wallet --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier --node=http://devnet-amplifier.axelar.dev:26657`,
    "approve prover with multisig"
  );

  // Approve proposals
  run(
    `axelard tx gov vote 34 yes --keyring-backend test --from wallet --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier --node=http://devnet-amplifier.axelar.dev:26657  --chain-id=devnet-amplifier`,
    "vote on proposal"
  );
}
