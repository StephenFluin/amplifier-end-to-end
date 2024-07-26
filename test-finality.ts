import pc from "picocolors";
import { AMPLIFIER_CONFIG } from "./configs/amplifier-deployments";
import {
  downloadAxelard,
  getPollFromRelay,
  getTxHashFromCast,
  relay,
  run,
} from "./helpers";

/**
 * See if verifiers will vote before finality has been achieved.
 * Send a Tx, relay it early, and then check for votes
 */
export async function testFinality() {
  await downloadAxelard();
  // Ethereum sepolia gateway for devnet-verifiers
  const tx = run(
    `cast send 0x2A8465a312ebBa54D774972f01D64574a5acFC63 \
        "callContract(string, string, bytes)" \
        "avalanche" "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4" 00 \
         --rpc-url https://1rpc.io/sepolia --mnemonic-path ./private.mneumonic`,
    "send a message sepolia to fuji via devnet-verifiers gateway"
  );

  // read the "transactionHash" from the output
  const transactionHash = getTxHashFromCast(tx);

  if (transactionHash) {
    console.log(
      "TransactionHash of Sepolia->Avalanche Message:",
      pc.green(transactionHash)
    );
  } else {
    console.log("failure!");
    console.log(tx);
    return;
  }
  const wait = 0;
  const SOURCE_WASM_GATEWAY =
    AMPLIFIER_CONFIG["devnet-verifiers"].SEPOLIA_GATEWAY;

  console.log("Waiting for " + wait + " minutes before relaying the message");
  setTimeout(() => {
    const results = relay(
      "devnet-verifiers",
      SOURCE_WASM_GATEWAY,
      "sepolia",
      transactionHash,
      0,
      "avalanche",
      "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4",
      "0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA",
      "bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a"
    );
    const pollId = getPollFromRelay(results);
    console.log(
      `See the poll here: https://devnet-verifiers.axelarscan.io/vm-poll/${SOURCE_WASM_GATEWAY}_${pollId}`
    );
  }, wait * 60 * 1000);
}
