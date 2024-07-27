import { getConfig } from "./configs/amplifier-deployments";
import { run } from "./helpers";

export async function testRotation(options: any) {
  const chain = options.chain;
  const network = options.network;
  // Call UpdateVerifierSet on Multisig Prover of target chain
  const config = await getConfig(network);

  const prover = config.axelar.contracts.MultisigProver[chain].address;
  console.log(
    config.axelar.contracts.MultisigProver[chain].address,
    "chain is",
    chain
  );
  const cmd = `axelard tx wasm execute ${prover} \
   '"update_verifier_set"' \
    --from amplifier  \
    --gas auto --gas-adjustment 1.5 --gas-prices ${config.axelar.gasPrice} \
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
    // Submit on external ethereum-sepolia devnet-verifiers gateway
    const result = run(
      `cast send 0x2A8465a312ebBa54D774972f01D64574a5acFC63 0x${hexData} --rpc-url https://rpc.ankr.com/eth_sepolia --mnemonic-path ./private.mneumonic`,
      "submit the signer rotation transaction on external chain"
    );
    console.log(result);
  }
}
