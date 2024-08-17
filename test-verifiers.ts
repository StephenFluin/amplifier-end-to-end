import pc from "picocolors";
import { getTxHashFromCast, verifyMessages, run, sleep } from "./helpers";
import { KNOWN_VERIFIERS } from "./known-verifiers";
import { FINALITIES, getConfig } from "./configs/amplifier-deployments";

/**
 * Run a transaction and see which verifiers vote on it
 */
export async function testVerifiers(options: any) {
  const limit = 50;
  // Wait in seconds
  const wait = 30;

  const chain = "avalanche";

  const config = await getConfig(options.network);

  const tx = run(
    `cast send ${config.chains[options.chain].contracts.AxelarGateway.address} \
    "callContract(string, string, bytes)" \
    "${
      options.destinationChain
    }" "0x8f8dedd09E23E22E1555e9D2C25D7c7332291919" 00 \
     --rpc-url ${
       config.chains[options.chain].rpc
     } --mnemonic-path ./private.mneumonic`,
    `send a message from ${options.chain} to ${options.destinationChain} via ${options.network} gateway`
  );
  const txHash = getTxHashFromCast(tx);
  console.log(`Message sent on ${options.chain}. Tx:`, pc.green(txHash));

  console.log("Relaying message after finality");
  await sleep(FINALITIES[options.chain] * 1000);

  // I think we have to relay (verify messages) to know which poll is ours
  const verificationPoll = await verifyMessages(
    options.network,
    options.chain,
    txHash,
    0,
    options.destinationChain,
    "0x8f8dedd09E23E22E1555e9D2C25D7c7332291919",
    "0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA",
    "bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a"
  );

  // regular expression to get the poll id from "\"poll_id\",\"value\":\"\\\"1396"
  const pollId = verificationPoll.match(
    /\"poll_id\",\"value\":\"\\\"(\d+)/
  )![1];
  console.log("Poll id is", pollId);

  // Now query Axelar after votes (give them 4x normal time)
  console.log(`Waiting ${FINALITIES.axelar * 4}s for votes`);
  await sleep(FINALITIES.axelar * 4 * 1000);
  const voterData = run(
    `axelard q wasm contract-state smart ${
      config.axelar.contracts.VotingVerifier[options.chain].address
    } '{"poll":{"poll_id":"${pollId}"}}' -o json --node ${config.axelar.rpc}`,
    "get poll votes"
  );
  const votes = JSON.parse(voterData).data.poll.participation;
  const voters = Object.keys(votes).map(
    (voter: string) => KNOWN_VERIFIERS[voter] || "Unknown / Internal"
  );
  // sort voters alphabetically
  voters.sort();
  console.log("Voters are", voters);

  // Post report into Discord
}
function sortByFirstItem(arrayOfArrays: [string, string, string, string][]) {
  return arrayOfArrays.sort((a, b) => a[0].localeCompare(b[0]));
}
