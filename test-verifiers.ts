import { run } from "./helpers";
import { KNOWN_VERIFIERS } from "./known-verifiers";
const limit = 30;
// Wait in seconds
const wait = 120;

const tx = run(
  `cast send 0x0A3b8dC7706C47b6DD87D771DF63875B1c5Cd867 \
    "sendMessage(string, string, string)" \
    "ethereum-sepolia" "0x8f8dedd09E23E22E1555e9D2C25D7c7332291919" "Hello world 2024-07-08-2" \
     --rpc-url https://api.avax-test.network/ext/bc/C/rpc --mnemonic-path ./private.mneumonic`,
  "send a message from fuji to sepolia via devnet-verifiers gateway"
);
console.log("message sent on Fuji. Tx:", tx);

// Now query Axelar after 30 seconds, looking for every vote on Fuji voting verifier
setTimeout(() => {
  const findPagination = run(
    `axelard q txs --events 'message.action=/cosmwasm.wasm.v1.MsgExecuteContract' --limit=1 -o json \
 --node=http://devnet-verifiers.axelar.dev:26657`,
    "query all cosmwasm executions"
  );
  // look for total_count: "1049" in the output
  const count = parseInt(JSON.parse(findPagination)["total_count"]);
  if (!count) {
    console.error("Error: could not find total_count in output");
    process.exit(1);
  }
  const results: any[] = [];
  results.push(...fetchPage(Math.ceil(count / limit)));
  results.push(...fetchPage(Math.ceil(count / limit) - 1));
  for (let verifier of sortByFirstItem(results)) {
    console.log(`${verifier[0]} (block ${verifier[2]})`);
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
      if (diff > wait * 1000) {
        console.log(
          "Rejecting ",
          timestamp,
          " from ",
          tx.hash,
          " as too old with diff of",
          diff
        );
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
        console.log(
          `Found no vote event in ${tx.logs.length} logs and ${tx.logs[0].events.length} events in block ${tx.height}`
        );
        return false;
      }
    })
    .filter((address: any) => !!address);
  const friendlyVoterData = voters.map(
    (voteData: [string, string, string, string]) => [
      KNOWN_VERIFIERS[voteData[0]] || `Unknown Verifier: ${voteData[0]}`,
      voteData[0],
      voteData[1],
      voteData[2],
    ]
  );
  console.log("Found voters:", friendlyVoterData);
  return friendlyVoterData;
}

function sortByFirstItem(arrayOfArrays: [string, string, string, string][]) {
  return arrayOfArrays.sort((a, b) => a[0].localeCompare(b[0]));
}

console.log(`querying for verifiers after ${wait} seconds`);

// Post report into Discord
