def instantiate_contracts():
    # git clone https://github.com/axelarnetwork/axelar-amplifier
    # cd axelar-amplifier
    # git checkout ampd-v0.2.0
    #     docker run --rm -v "$(pwd)":/code \
    # --mount type=volume,source="$(basename "$(pwd)")_cache",target=/target \
    # --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
    # cosmwasm/optimizer:0.15.1
    #     axelard tx wasm store artifacts/voting_verifier.wasm \
    #     --keyring-backend test \
    #     --from wallet \
    #     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    #     --chain-id devnet-amplifier \
    #     --node http://devnet-amplifier.axelar.dev:26657

    #     axelard tx wasm store artifacts/gateway.wasm \
    #     --keyring-backend test \
    #     --from wallet \
    #     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    #     --chain-id devnet-amplifier \
    #     --node http://devnet-amplifier.axelar.dev:26657

    # axelard tx wasm store artifacts/multisig_prover.wasm \
    #     --keyring-backend test \
    #     --from wallet \
    #     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    #     --chain-id devnet-amplifier \
    #     --node http://devnet-amplifier.axelar.dev:26657

    # axelard tx wasm instantiate $VERIFIER_CODE_ID \
    #     '{
    #         "governance_address": "axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9",
    #         "service_registry_address":"axelar1c9fkszt5lq34vvvlat3fxj6yv7ejtqapz04e97vtc9m5z9cwnamq8zjlhz",
    #         "service_name":"validators",
    #         "source_gateway_address":"'"$MY_SOURCE_CHAIN_GATEWAY_ADDRESS"'",
    #         "voting_threshold":["1","1"],
    #         "block_expiry":10,
    #         "confirmation_height":1,
    #         "source_chain":"test",
    #         "rewards_address":"axelar1vaj9sfzc3z0gpel90wu4ljutncutv0wuhvvwfsh30rqxq422z89qnd989l"
    #     }' \
    #     --keyring-backend test \
    #     --from wallet \
    #     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    #     --chain-id devnet-amplifier \
    #     --node http://devnet-amplifier.axelar.dev:26657 \
    #     --label test-voting-verifier \
    #     --admin $MY_WALLET_ADDRESS

    # axelard tx wasm instantiate $GATEWAY_CODE_ID \
    #     '{
    #         "verifier_address": "'"$MY_VERIFIER_ADDRESS"'",
    #         "router_address": "axelar14jjdxqhuxk803e9pq64w4fgf385y86xxhkpzswe9crmu6vxycezst0zq8y"
    #     }' \
    #     --keyring-backend test \
    #     --from wallet \
    #     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    #     --chain-id devnet-amplifier \
    #     --node http://devnet-amplifier.axelar.dev:26657 \
    #     --label test-gateway \
    #     --admin $MY_WALLET_ADDRESS

    # axelard tx wasm instantiate $PROVER_CODE_ID \
    #     '{
    #         "admin_address": "'"$MY_WALLET_ADDRESS"'",
    #         "governance_address": "axelar1zlr7e5qf3sz7yf890rkh9tcnu87234k6k7ytd9",
    #         "gateway_address": "'"$MY_GATEWAY_ADDRESS"'",
    #         "multisig_address": "axelar19jxy26z0qnnspa45y5nru0l5rmy9d637z5km2ndjxthfxf5qaswst9290r",
    #         "coordinator_address":"axelar1m2498n4h2tskcsmssjnzswl5e6eflmqnh487ds47yxyu6y5h4zuqr9zk4g",
    #         "service_registry_address":"axelar1c9fkszt5lq34vvvlat3fxj6yv7ejtqapz04e97vtc9m5z9cwnamq8zjlhz",
    #         "voting_verifier_address": "'"$MY_VERIFIER_ADDRESS"'",
    #         "destination_chain_id": "'"$MY_CHAIN_ID"'",
    #         "signing_threshold": ["1","1"],
    #         "service_name": "validators",
    #         "chain_name":"test",
    #         "worker_set_diff_threshold": 1,
    #         "encoder": "abi",
    #         "key_type": "ecdsa"
    #     }' \
    #     --keyring-backend test \
    #     --from wallet \
    #     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier \
    #     --chain-id devnet-amplifier \
    #     --node http://devnet-amplifier.axelar.dev:26657 \
    #     --label test-prover  \
    #     --admin $MY_WALLET_ADDRESS

    pass


def update_worker_set():
    pass


def supply_rewards():
    pass


def verify_messages():
    pass


def route_messages():
    pass


def construct_proof():
    pass


def distribute_rewards():
    pass


def get_worker_set_proof():
    pass


def get_message_proof():
    pass
