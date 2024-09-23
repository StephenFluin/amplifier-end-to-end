import { FINALITIES, getConfig } from "./configs/amplifier-deployments";
import {
  getProofExecuteData,
  getSessionIdFromCommand,
  getTxHashFromCast,
  run,
} from "./helpers";

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
  if (!options.multisigSessionId && !options.messageId) {
    const cmd = `axelard tx wasm execute ${prover} \
   '"update_verifier_set"' \
    --from testnet-admin --keyring-backend test \
    --gas auto --gas-adjustment 1.5 --gas-prices ${config.axelar.gasPrice} \
    --chain-id=${config.axelar.chainId} \
    --node ${config.axelar.rpc}`;
    if (options.privileged) {
      console.log("running\n", cmd, "as privileged user");
      try {
        const result = run(cmd, "run update_verifier_set as privileged user", {
          allowErrors: true,
        });
        const sessionId = getSessionIdFromCommand(result);

        console.log(`SessionId is ${sessionId}`);
        if (sessionId) {
          options.multisigSessionId = sessionId;
          console.log(
            "Waiting ",
            FINALITIES["axelar"],
            `s for signing on axelar.`
          );
          setTimeout(() => {
            testRotation(options);
          }, FINALITIES["axelar"] * 1000);
        }
      } catch (error: any) {
        // Check if error.stderr contains "verifier set has not changed sufficiently"
        if (
          error.stderr.includes("verifier set has not changed sufficiently")
        ) {
          console.log(
            "Can't rotate signers, need a bigger change to the verifier set."
          );
          process.exit(1);
        }
        console.error(
          "Unknown error running `update_verifier_set`",
          error.stderr
        );
      }
    } else {
      console.log("Run with authorized user:\n", cmd);
    }
  } else if (options.multisigSessionId && !options.messageId) {
    // eg 2974
    console.log("We already have a session, investigating...");

    const hexData = getProofExecuteData(
      prover,
      options.multisigSessionId,
      config.axelar.rpc
    );
    console.log("hex to execute is", hexData.length, "long");
    // Submit on external ethereum-sepolia devnet-verifiers gateway
    const result = run(
      `cast send ${config.chains[chain].contracts.AxelarGateway.address} 0x${hexData} \
       --rpc-url ${config.chains[chain].rpc} --mnemonic-path ./private.mneumonic`,
      "submit the signer rotation transaction on external chain"
    );
    const tx = getTxHashFromCast(result);
    if (!tx) {
      console.log("Couldn't get Tx from rotation results", result);
    }
    console.log("Successfully rotated signers at destination chain. Tx:", tx);
    setTimeout(() => {
      options.messageId = tx + "-0";
      testRotation(options);
    }, FINALITIES[chain] * 1000);
    console.log("Waiting ", FINALITIES[chain], `s for finality on ${chain}`);
    console.log("manually invoke with:");
    console.log(
      `./ae2e test-rotation -c ${chain} -n ${network} --message-id ${tx}-0`
    );
  }
  if (options.messageId) {
    let result = run(
      `axelard q wasm contract-state smart ${config.axelar.contracts.MultisigProver[chain].address}\
           '"next_verifier_set"'  -ojson --node ${config.axelar.rpc}`,
      "get next verifier set"
    );
    const verifierSet = JSON.parse(result).data["verifier_set"];
    //console.log("set is", verifierSet);

    // {      "signers":{"axelar139lxtg3qunfa285hfr4d0qlyw4hh07e9n0mud7":{"address":"axelar139lxtg3qunfa285hfr4d0qlyw4hh07e9n0mud7","weight":"1","pub_key":{"ecdsa":"03411ad5c6475a72b6d723d17262d420ee44e1869e298009ea1df4bffa28eadb1a"}},"axelar13crjq72c36stpcvzde7zmr3n5kmzssescvn3gs":{"address":"axelar13crjq72c36stpcvzde7zmr3n5kmzssescvn3gs","weight":"1","pub_key":{"ecdsa":"0351017bbeb1b7923573d9fe4fb294f764bac34e1ec4dd80144b1561e0988e6352"}},"axelar14dcl3nyfu47dmkjaqwxt08577m3m3cy7332xe5":{"address":"axelar14dcl3nyfu47dmkjaqwxt08577m3m3cy7332xe5","weight":"1","pub_key":{"ecdsa":"024811b0a776ada8f9b4fb272425ee0f2d8dd930df19ddcdf27ffe8bd8e4855c82"}},"axelar14r7fxm92hfkar3akpwfxwdjeueegnd2e5evwav":{"address":"axelar14r7fxm92hfkar3akpwfxwdjeueegnd2e5evwav","weight":"1","pub_key":{"ecdsa":"0330f4a56dc86a51bcbcbd9268186eb27ae9ade54039d9fbb080e88cfa78700d70"}},"axelar156hdwk32aypw9xcqzcrjhaxag3r5ugakg25lx7":{"address":"axelar156hdwk32aypw9xcqzcrjhaxag3r5ugakg25lx7","weight":"1","pub_key":{"ecdsa":"039be39c12852bec4bc04c5511cc602dad500f57cceb3db339162a0b26959d265f"}},"axelar16up4l9knk42kkj3e4vn4w453470vrayddg0y7f":{"address":"axelar16up4l9knk42kkj3e4vn4w453470vrayddg0y7f","weight":"1","pub_key":{"ecdsa":"033feaa0a87d37994e06daac55ab602afbba4e678237ab1104f5bab90e489138e3"}},"axelar170qsn38w7y65u0cdasznumqsefmpkht5zrn367":{"address":"axelar170qsn38w7y65u0cdasznumqsefmpkht5zrn367","weight":"1","pub_key":{"ecdsa":"036b66b507abc42210e3c3556ab2545f1280b8fb9f1f30ad63b69015be98532cb6"}},"axelar1f0ys8e82l7ht397xuut0r2kx55qp7vkslhyljf":{"address":"axelar1f0ys8e82l7ht397xuut0r2kx55qp7vkslhyljf","weight":"1","pub_key":{"ecdsa":"02679e8aacc960ce8ca032850e1c28ffe14e81a181284f2ae3853a2a2b5e3bf81e"}},"axelar1k973g5dp875cw0nwythn3tjmgvsmzu9we3jwl6":{"address":"axelar1k973g5dp875cw0nwythn3tjmgvsmzu9we3jwl6","weight":"1","pub_key":{"ecdsa":"021d3a7712ac0121bef5c878418761b938e9f07c450049ff76606a7ccd2332f354"}},"axelar1ms24zzalgfukc2ca3wy045l9vyx6x7an4ch9un":{"address":"axelar1ms24zzalgfukc2ca3wy045l9vyx6x7an4ch9un","weight":"1","pub_key":{"ecdsa":"020e0bb6b59c8c5663702e1ca16803f2026467632e855f07a7657c33671c63d56e"}},"axelar1n7sups27f26x6qr0tkmpnavklg5d5ue69l32tj":{"address":"axelar1n7sups27f26x6qr0tkmpnavklg5d5ue69l32tj","weight":"1","pub_key":{"ecdsa":"026461f03ec124a8af7c82895f07f8111a3679be7741036960cb5639a05f52524f"}},"axelar1rnxdcj4l5zpcr4kfp4x33j94u4khytxsevdhu3":{"address":"axelar1rnxdcj4l5zpcr4kfp4x33j94u4khytxsevdhu3","weight":"1","pub_key":{"ecdsa":"023e84d1e93bc7df7f73d7e15123f63f42f9179b977b7fd739f27fb7ae51bafe18"}},"axelar1rnyqx3fjw2m4a527rsdc587cd8mehy5d78fgk0":{"address":"axelar1rnyqx3fjw2m4a527rsdc587cd8mehy5d78fgk0","weight":"1","pub_key":{"ecdsa":"02eb112f07674a14dece629aa55270aee13320d3911be6477e0a0a2c8d063a1191"}},"axelar1s6hnecepvzpqu5d6du8u2pwd23003l0fd35gd5":{"address":"axelar1s6hnecepvzpqu5d6du8u2pwd23003l0fd35gd5","weight":"1","pub_key":{"ecdsa":"03876487c55d4c64a6d8b29249a60692c07ec9e56b05b8760dbaea9ca56efacce8"}},"axelar1tyl4zumcecs7lh8q30z45n0pclqs9xwll2z0y2":{"address":"axelar1tyl4zumcecs7lh8q30z45n0pclqs9xwll2z0y2","weight":"1","pub_key":{"ecdsa":"03cced8c5eae88c0a2a9bf228b5ea40cb7e0a04bcc6157995b33c70784a80d280b"}},"axelar1ul4qrc3w52ejtgsth4sqjmrtxs78n5y84fecrl":{"address":"axelar1ul4qrc3w52ejtgsth4sqjmrtxs78n5y84fecrl","weight":"1","pub_key":{"ecdsa":"03104640f4ecbb82143848722242e82483d229bac7b25e2263d2103af78131f238"}},"axelar1yx4ufkdde7f5c69netj7gc98w7u0c480l83rhd":{"address":"axelar1yx4ufkdde7f5c69netj7gc98w7u0c480l83rhd","weight":"1","pub_key":{"ecdsa":"03526d479ea372bb6782273f66657cd071cbde773f74e4dd53dff461db6030ea71"}},"axelar1zn5z4a0vl4vhpjxyjft2tmn09h6wy0zfgwgqug":{"address":"axelar1zn5z4a0vl4vhpjxyjft2tmn09h6wy0zfgwgqug","weight":"1","pub_key":{"ecdsa":"03405f708c383ebe7c4a013cb07e9021bd9924d79e235855ca71e3d87711aeda1d"}}},"threshold":"11","created_at":1758830}    }
    const voteStart = run(
      `axelard tx wasm execute ${
        config.axelar.contracts.VotingVerifier[chain].address
      }  \
      '{
        "verify_verifier_set": {
            "message_id": "${options.messageId}",
            "new_verifier_set": ${JSON.stringify(verifierSet)}
      }
    }'    \
      --keyring-backend test --from wallet --gas auto --gas-adjustment 1.5 --gas-prices ${
        config.axelar.gasPrice
      } \
      --chain-id=${config.axelar.chainId}      --node ${config.axelar.rpc}`,
      "verify verifier set"
    );

    setTimeout(() => {
      const cmd = `axelard tx wasm execute ${config.axelar.contracts.MultisigProver[chain].address} \
      '"confirm_verifier_set"' \
      --keyring-backend test --from wallet --gas auto --gas-adjustment 1.5 --gas-prices ${config.axelar.gasPrice}  \
      --chain-id=${config.axelar.chainId}      --node ${config.axelar.rpc}`;
      console.log("running", cmd);
      const output = run(cmd, "confirm verifier set");

      if (output.includes("failed")) {
        console.log(
          "Failed to confirm verifier set! You'll need to re-run the verification step before anything will work."
        );
        console.log(
          `./ae2e test-rotation -c ${chain} -n ${network} --message-id ${options.messageId}`
        );
        console.log(output);
        process.exit(1);
      }
    }, FINALITIES.axelar * 1000);
    console.log("Waiting ", FINALITIES.axelar, `s for votes on axelar`);
    console.log("Going to confirm the verifier set.");
  }
}

export async function getVerifierSet(options: any) {
  const config = await getConfig(options.network);
  const chain = options.chain;

  let result = run(
    `axelard q wasm contract-state smart ${config.axelar.contracts.MultisigProver[chain].address}\
         '"${options.setType}_verifier_set"'  -ojson --node ${config.axelar.rpc}`,
    `get ${options.type} verifier set`
  );
  const data = JSON.parse(result);
  if (!data.data?.["verifier_set"]) {
    console.log(data);
  } else {
    const verifierSet = data.data["verifier_set"];
    console.log(verifierSet);
  }
}
