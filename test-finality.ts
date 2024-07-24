import { AMPLIFIER_CONFIG } from "./configs/amplifier-deployments";
import { run } from "./helpers";

/**
 * See if verifiers will vote before finality has been achieved.
 * Send a Tx, relay it early, and then check for votes
 */
export async function testFinality() {
  const tx = run(
    `cast send 0x2A8465a312ebBa54D774972f01D64574a5acFC63 \
        "callContract(string, string, bytes)" \
        "avalanche" "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4" 00 \
         --rpc-url https://1rpc.io/sepolia --mnemonic-path ./private.mneumonic`,
    "send a message sepolia to fuji via devnet-verifiers gateway"
  );

  // read the "transactionHash" from the output
  const transactionHash = (tx.match(/transactionHash\s*(0x[a-zA-Z0-9]*)/) || [
    ,
    null,
  ])[1];

  if (transactionHash) {
    console.log(
      "TransactionHash of Sepolia->Avalanche Message:",
      transactionHash
    );
  } else {
    console.log("failure!");
    console.log(tx);
    return;
  }

  const SOURCE_WASM_GATEWAY =
    AMPLIFIER_CONFIG["devnet-verifiers"].SEPOLIA_GATEWAY;
  const relay = run(
    `bin/axelard tx wasm execute ${SOURCE_WASM_GATEWAY} \
    '{"verify_messages":
        [{"cc_id":{
          "chain":"ethereum-sepolia",
          "id":"${transactionHash}-0"},
          "destination_chain":"avalanche",
          "destination_address":"0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4",
          "source_address":"0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA",
          "payload_hash":"bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a"}]
      }' \
    --keyring-backend test \
    --from wallet \
    --gas auto --gas-adjustment 1.5 \
    --gas-prices 0.007uverifiers \
    --chain-id=devnet-verifiers \
    --node http://devnet-verifiers.axelar.dev:26657`,
    "relay the message to the Axelar network"
  );
}
