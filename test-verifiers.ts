import pc from "picocolors";
import { getTxHashFromCast, run } from "./helpers";
import { KNOWN_VERIFIERS } from "./known-verifiers";

/**
 * Run a transaction and see which verifiers vote on it
 */
export function testVerifiers() {
  const limit = 30;
  // Wait in seconds
  const wait = 30;

  const tx = run(
    `cast send 0x8a2DB90356402a00dbfFeeF2629F590B4929Df5F \
    "callContract(string, string, bytes)" \
    "ethereum-sepolia" "0x8f8dedd09E23E22E1555e9D2C25D7c7332291919" 00 \
     --rpc-url https://api.avax-test.network/ext/bc/C/rpc --mnemonic-path ./private.mneumonic`,
    "send a message from fuji to sepolia via devnet-verifiers gateway"
  );
  console.log("Message sent on Fuji. Tx:", pc.green(getTxHashFromCast(tx)));

  // Now query Axelar after 30 seconds, looking for every vote on Fuji voting verifier
  setTimeout(() => {
    const findPagination = run(
      `bin/axelard q txs --events 'message.action=/cosmwasm.wasm.v1.MsgExecuteContract' --limit=1 -o json \
 --node=http://devnet-verifiers.axelar.dev:26657`,
      "query all cosmwasm executions"
    );
    // look for total_count: "1049" in the output
    const count = parseInt(JSON.parse(findPagination)["total_count"]);
    if (!count) {
      console.error(pc.red("Error") + ": could not find total_count in output");
      process.exit(1);
    }
    const results: any[] = [];
    results.push(...fetchPage(Math.ceil(count / limit)));
    results.push(...fetchPage(Math.ceil(count / limit) - 1));
    for (let verifier of sortByFirstItem(results)) {
      console.log(`${verifier[0]} (block ${verifier[2]})`);
    }
    if (results.length === 0) {
      console.error(pc.red("No votes found, problem with relayer?"));
    }
  }, wait * 1000);

  function fetchPage(page: number): any[] {
    const cmd = `axelard q txs --events 'message.action=/cosmwasm.wasm.v1.MsgExecuteContract' -o json \
  --page ${page} --limit ${limit} --node=http://devnet-verifiers.axelar.dev:26657`;
    console.log(`Fetching page ${page} with ${cmd}`);
    const txs = run(cmd, "query page " + page + " of cosmwasm executions");

    // Scan txs object for votes and voters
    const voters = JSON.parse(txs)
      .txs.map((tx: any) => {
        // Only consider the last 2 minutes of responses
        const timestamp = new Date(tx.timestamp);
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const sender = KNOWN_VERIFIERS[tx.tx.body.messages[0].sender];

        // Look 15 seconds longer than wait
        if (diff > wait * 1000 + 15000) {
          // Ignore this transaction because it's too old, likely from another round
          // console.log(
          //   "Rejecting ",
          //   timestamp,
          //   " from ",
          //   tx.txhash,
          //   " as too old because it's",
          //   Math.round(diff / 1000),
          //   "seconds old, in block",
          //   tx.height
          // );
          return false;
        }

        const vote = tx.logs[0].events.find(
          (event: any) => event.type === "wasm-voted"
        );
        if (vote) {
          return [
            vote.attributes.find((attr: any) => attr.key === "voter").value,
            tx.height,
            tx.timestamp,
          ];
        } else {
          // This tx has no vote event
          return false;
        }
      })
      .filter((address: any) => !!address);
    const friendlyVoterData = voters.map(
      (voteData: [string, string, string, string]) => [
        KNOWN_VERIFIERS[voteData[0]] || `Unknown/Internal: ${voteData[0]}`,
        voteData[0],
        voteData[1],
        voteData[2],
      ]
    );
    //console.log("Found voters:", friendlyVoterData);
    return friendlyVoterData;
  }

  function sortByFirstItem(arrayOfArrays: [string, string, string, string][]) {
    return arrayOfArrays.sort((a, b) => a[0].localeCompare(b[0]));
  }

  console.log(`Querying for verifiers after ${pc.green(wait)} seconds`);

  // Post report into Discord
}
