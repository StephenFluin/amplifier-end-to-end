import { AMPLIFIER_CONFIG } from "./configs/amplifier-deployments";
import { run } from "./helpers";

export function testRotation(options: any) {
  const chain = options.chain;
  const network = options.network;
  // Call UpdateVerifierSet on Multisig Prover of target chain
  const prover = AMPLIFIER_CONFIG[options.network].PROVER[chain];
  console.log(AMPLIFIER_CONFIG[options.network].PROVER, "chain is", chain);
  const cmd = `axelard tx wasm execute ${prover} \
   '"update_verifier_set"' \
    --from amplifier  \
    --gas auto --gas-adjustment 1.5 --gas-prices 0.007${AMPLIFIER_CONFIG[network].CURRENCY} \
    --chain-id=${network}
  `;
  console.log("Run with authorized user:\n", cmd);

  if (options.multisigSessionId) {
    // eg 2974
    console.log("We already have a session, investigating...");
    const proofData = run(
      `axelard q wasm contract-state smart ${prover} \
       '{"get_proof":{"multisig_session_id":"${options.multisigSessionId}"}}' \
        --node http://devnet-verifiers.axelar.dev:26657`,
      "get proof"
    );

    const hexData = proofData.match(/execute_data: (.*)/)![1];
    console.log("hex to execute is", hexData.length, "long");
  }
}
