import pc from "picocolors";
import { FINALITIES, getConfig } from "./configs/amplifier-deployments";
import {
  downloadAxelard,
  getPollFromVerifyMessages,
  getTxHashFromCast,
  verifyMessages,
  run,
  getProofExecuteData,
  sleep,
} from "./helpers";

/**
 * See if verifiers will vote before finality has been achieved.
 * Send a Tx, relay it early, and then check for votes.
 * Also useful for sending general messages, as it will relay them
 */
export async function testFinality(options: any) {
  const chainName = options.chain;
  const destinationChainName = options.destination;
  const destinationAddress = "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4";
  const sourceAddress = "0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA";
  const payloadHash =
    "bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a";
  const network = options.network;

  const config = await getConfig(network);

  if (options.wait == "-1") {
    options.wait = FINALITIES[chainName];
  }

  let relay;
  if (options.relay && options.relay !== "false") {
    console.log("Will relay messages.");
    relay = true;
  } else {
    console.log("Will not relay messages.");
    relay = false;
  }

  await downloadAxelard();
  // Ethereum sepolia gateway for devnet-verifiers
  const tx = run(
    `cast send ${config.chains[chainName].contracts.AxelarGateway.address} \
        "callContract(string, string, bytes)" \
        "${destinationChainName}" "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4" 00 \
         --rpc-url ${config.chains[chainName].rpc} --mnemonic-path ./private.mneumonic`,
    `send a message ${chainName} to ${destinationChainName} via ${network} gateway`
  );

  // read the "transactionHash" from the output
  const transactionHash = getTxHashFromCast(tx);

  if (transactionHash) {
    console.log(
      `TransactionHash of ${chainName}->${destinationChainName} via ${pc.green(
        network
      )}: ${pc.green(transactionHash)}`
    );
  } else {
    console.log("failure!");
    console.log(tx);
    return;
  }
  const wait = options.wait;

  if (!relay) {
    console.log("Not relaying the message, all done.");
    return;
  }

  console.log("Waiting for " + wait + " seconds before relaying the message");
  await sleep(wait * 1000);

  const results = await verifyMessages(
    network,
    chainName,
    transactionHash,
    0,
    destinationChainName,
    destinationAddress,
    sourceAddress,
    payloadHash
  );
  console.log("verify messages command and results:", results);
  const pollId = getPollFromVerifyMessages(results);
  if (!pollId) {
    console.log("Poll failed to create, exiting.");
    return;
  }
  console.log(
    `See the poll here: https://${network}.axelarscan.io/vm-poll/${config.axelar.contracts.VotingVerifier[chainName].address}_${pollId}`
  );

  console.log("waiting " + FINALITIES.axelar + " seconds to attempt routing");
  await sleep(FINALITIES.axelar * 1000);
  let cmd = `bin/axelard tx wasm execute ${config.axelar.contracts.Gateway[chainName].address} \
  '{
    "route_messages":
      [
          {
            "cc_id":
              {
                "source_chain":"${chainName}",
                "message_id":"${transactionHash}-0"
              },
            "destination_chain":"${destinationChainName}",
            "destination_address":"${destinationAddress}",
            "source_address":"${sourceAddress}",
            "payload_hash":"${payloadHash}"
          }
      ]
  }' \
  --from wallet \
  --keyring-backend=test --gas auto --gas-adjustment 1.5 \
  --gas-prices ${config.axelar.gasPrice} \
  --chain-id=${config.axelar.chainId} \
  --node ${config.axelar.rpc}`;
  console.log("running", cmd);
  const routing = run(cmd, "route message");
  console.log("routing resulted in", routing);

  console.log("Waiting 7s for tx to be included to avoid sequence problems");
  await sleep(7000);

  // AVM, construct proof via AVM
  if (
    destinationChainName.startsWith("test-") ||
    network.startsWith("devnet-")
  ) {
    console.log("getting proof via amplifier");
    const proofSession = run(
      `axelard tx wasm execute ${config.axelar.contracts.MultisigProver[destinationChainName].address} '{
         "construct_proof":
          [
            {
              "source_chain":"${chainName}",
              "message_id":"${transactionHash}-0"
            }
          ]
         }' \
         --from wallet \
        --keyring-backend=test --gas auto --gas-adjustment 1.5 \
        --gas-prices ${config.axelar.gasPrice} \
        --chain-id=${config.axelar.chainId} \
        --node ${config.axelar.rpc}`,
      "construct proof"
    );
    console.log(`now wait ${FINALITIES.axelar}s for signing`);
    await sleep(FINALITIES.axlear * 1000);
    const executeData = await getProofExecuteData(
      config.axelar.contracts.MultisigProver[destinationChainName].address,
      "1234",
      config.axelar.rpc
    );
    console.log("Got executedata back with length:", executeData.length);
    const tx = run(
      `cast send ${config.chains[destinationChainName].contracts.AxelarGateway.address} \
          0x${executeData} \
           --rpc-url ${config.chains[destinationChainName].rpc} --mnemonic-path ./private.mneumonic`,
      `post tx to ${destinationChainName} ${network} gateway`
    );
    const executeHash = getTxHashFromCast(tx);
    console.log(
      `posted tx to ${destinationChainName} with hash ${executeHash}`
    );
  } else {
    // Consensus, construct proof via consensus
    console.log("getting proof via consensus");
    run(
      `axelard tx evm create-pending-transfers ${destinationChainName} --keyring-backend test --from wallet --chain-id ${config.axelar.chainId} --node ${config.axelar.rpc}`,
      "construct proof"
    );
    console.log("Waiting 7s for tx to be included to avoid sequence problems");

    await sleep(7000);
    const signatureSigning = run(
      `$ axelard tx evm sign-commands ${destinationChainName} --keyring-backend test --from wallet --chain-id ${config.axelar.chainId} --node ${config.axelar.rpc}`,
      "ask for signatures"
    );
    console.log("looking for signing session in", signatureSigning);
  }
  // const proof = run(,'construct proof');
  // console.log('got proof',proof);
}
