import { run } from "./helpers";

const tx = run(
  `cast send 0x0A3b8dC7706C47b6DD87D771DF63875B1c5Cd867 \
    "sendMessage(string, string, string)" \
    "ethereum-sepolia" "0x8f8dedd09E23E22E1555e9D2C25D7c7332291919" "Hello world 2024-07-08-2" \
     --rpc-url https://api.avax-test.network/ext/bc/C/rpc --mnemonic-path ./private.mneumonic'
  'send a message from fuji to sepolia via devnet-verifiers gateway'
);

// Now query Axelar after 30 seconds, looking for every vote on Fuji voting verifier
run(`axelard q txs --events 'message.action=/cosmwasm.wasm.v1.MsgExecuteContract' --node=http://devnet-verifiers.axelar.dev:26657 | grep vote`);

axelard q txs --events 'message.action=/cosmwasm.wasm.v1.MsgExecuteContract&message.sender=axelar156hdwk32aypw9xcqzcrjhaxag3r5ugakg25lx7' --node=http://devnet-verifiers.axelar.dev:26657 | grep -A3 "^    type: wasm-voted$"


// Match votes against known verifiers


// Print report


// Post report into Discord