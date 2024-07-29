import pc from "picocolors";
import { getConfig } from "./configs/amplifier-deployments";
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
export async function testFinality(options: any) {
  const chainName = options.chain;
  const destinationChainName = "avalanche";
  const network = options.network;

  const config = await getConfig(network);

  await downloadAxelard();
  // Ethereum sepolia gateway for devnet-verifiers
  const tx = run(
    `cast send ${config.chains[chainName].contracts.AxelarGateway.address} \
        "callContract(string, string, bytes)" \
        "${destinationChainName}" "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4" 00 \
         --rpc-url ${config.chains[chainName].rpc} --mnemonic-path ./private.mneumonic`,
    "send a message sepolia to fuji via devnet-verifiers gateway"
  );

  // read the "transactionHash" from the output
  const transactionHash = getTxHashFromCast(tx);

  if (transactionHash) {
    console.log(
      `TransactionHash of ${chainName}->${destinationChainName} via ${pc.green(
        network
      )}:${pc.green(transactionHash)}`
    );
  } else {
    console.log("failure!");
    console.log(tx);
    return;
  }
  const wait = options.wait;

  console.log("Waiting for " + wait + " minutes before relaying the message");
  setTimeout(async () => {
    const results = await relay(
      network,
      chainName,
      transactionHash,
      0,
      "avalanche",
      "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4",
      "0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA",
      "bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a"
    );
    const pollId = getPollFromRelay(results);
    console.log(
      `See the poll here: https://${network}.axelarscan.io/vm-poll/${config.axelar.contracts.VotingVerifier[chainName].address}_${pollId}`
    );
  }, wait * 60 * 1000);
}
