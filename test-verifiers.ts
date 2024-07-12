import { run } from "./helpers";
const limit = 30;
// Wait in seconds
const wait = 120;

const verifiers: { [key: string]: string } = {
  axelar1ks5em0gmml0qjfek0msqm9pxcmawj54as65j5v: "MultiversX Verifier #1 - #3",
  axelar1v2qnjptahr9syeekakkc7p8md2n2l7zmdu7xwx: "MultiversX Verifier #1 - #3",
  axelar1c29hzkdly6n26dv504qxncwt7eecqpau29kkg2: "MultiversX Verifier #1 - #3",
  axelar1d73v2p9gdk2usxhh5k9kham2s42ccrydrd67hg: "KingSuper",
  axelar1rnyqx3fjw2m4a527rsdc587cd8mehy5d78fgk0: "Node.Monster",
  axelar1n7sups27f26x6qr0tkmpnavklg5d5ue69l32tj: "ContributionDAO",
  axelar14dcl3nyfu47dmkjaqwxt08577m3m3cy7332xe5: "uverifiers",
  axelar1dfw0etmwwka0c02am0l8vc7l3dqk4xe06vr4zx: "Stakin",
  axelar139lxtg3qunfa285hfr4d0qlyw4hh07e9n0mud7: "uverifiers",
  axelar1ul4qrc3w52ejtgsth4sqjmrtxs78n5y84fecrl: "Validatrium",
  axelar1rlv40z8cgrcfwykac73q6vy5z5n2cfknwv2ylq: "Polkachu",
  axelar1rnxdcj4l5zpcr4kfp4x33j94u4khytxsevdhu3: "ChainodeTech",
  axelar14xlsptge83gdsrquhkcekj2xn6a7cvwhrjzjf8: "LunaNova",
  axelar1qjya6uqya82ny0ensz5p7nysqjyncjsslrhld6: "commonprefix",
  axelar1j9ze6ym0q06ppfx94pz04l72vye0patgc57gyz: "P2P.ORG",
  axelar14r7fxm92hfkar3akpwfxwdjeueegnd2e5evwav: "Brightlystake",
  axelar1sa9ac5edsetfx295wlfu9dxu3fwkdvu6q0h44e: "pegasus",
  axelar156hdwk32aypw9xcqzcrjhaxag3r5ugakg25lx7: "P-OPS Team",
  axelar1jva4lh60vj7cqz7pvjj7zceucyw6a6utp29c8x: "Common Prefix Hedera",
  axelar1kkru07tvp3nmsqvprep8ju0jrg5pprukah0p0e: "Eiger",
  axelar1zduz4ts027zq82ffh447xkg90cwxskyzlpu5w5: "Chainlayer",
  axelar16up4l9knk42kkj3e4vn4w453470vrayddg0y7f: "Stakin",
  axelar1s6hnecepvzpqu5d6du8u2pwd23003l0fd35gd5: "StephenTheVerifier",
  axelar1zn5z4a0vl4vhpjxyjft2tmn09h6wy0zfgwgqug: "IdrisTheVerifier",
  axelar1yx4ufkdde7f5c69netj7gc98w7u0c480l83rhd: "LunaNova",
  axelar1f0ys8e82l7ht397xuut0r2kx55qp7vkslhyljf: "Chainlayer",
  axelar1tyl4zumcecs7lh8q30z45n0pclqs9xwll2z0y2: "Polkachu",
  axelar1ms24zzalgfukc2ca3wy045l9vyx6x7an4ch9un: "ChainodeTech",
  axelar1y7vc0r8vt4rhyp2snvtdh0d9se04xlcfuffu8g:
    "XRPL EVM Sidechain - Peersyst",
  axelar1ure22quyrl8wdyxz4jdx285hp4dwufwt0g0akl: "validators",
  axelar15xphll3h5vcs2n8ckcpf4mu5znzspwu66ge9py: "Enigma",
  axelar17xlmznfxda8vd7sryg7vrc7ehv86f9v77e5ygm: "Imperator.co",
  axelar1xnqn4jsafk8fn9xa68we2hlgp96xftmfpcpdp8: "polkachu",
  axelar1c273aslmvh9dn9xaf2tu42edjfqgvhy70q8g02: "RockawayX Infra",
};

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
        return false;
      }
    })
    .filter((address: any) => !!address);
  const friendlyVoterData = voters.map(
    (voteData: [string, string, string, string]) => [
      verifiers[voteData[0]] || `Unknown Verifier: ${voteData[0]}`,
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
