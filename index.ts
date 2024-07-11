import * as verifier from "./verifier";
import * as source from "./source";
import * as axelar from "./axelar";
import { downloadAmpd, downloadAxelard } from "./helpers";
import { run } from "./helpers";
import { existsSync } from "fs";

const action = process.argv[2];
if (!action) {
  console.log("please specify an action, `integrator`, `verifier` or `tx`");
  process.exit(1);
}
console.log("Running", action, "workflow");
const network =
  process.argv.indexOf("--amplifier") === -1 ? "verifiers" : "amplifier";
switch (action) {
  case "setupDeployment":
    setupDeployer();
    break;
  case "integrator":
    setupIntegration();
    break;
  case "verifier":
    setupVerifier(network);
    break;
  case "tx":
    source.create_tx();
    break;
  case "verify":
    axelar.verifyMessages();
    break;
  default:
    console.error("Invalid action");
}

//setup gateway deployment
export async function setupDeployer() {
  const clearFlag = process.argv.indexOf("--clear") === -1 ? false : true;
  if (clearFlag)
    run("rm -rf axelar-contract-deployments", "remove and replace old repo");

  if (!existsSync("axelar-contract-deployments")) {
    run(
      "git clone https://github.com/axelarnetwork/axelar-contract-deployments",
      "clone repo"
    );
    run(
      `cd axelar-contract-deployments;git checkout 019d41f81b506d35fa89ffd9ebb3a02719563e09;npm i`,
      "install dependencies"
    );
  }
  console.log(
    "Deployer cloned in your ./axelar-contract-deployments directory"
  );
  console.log(
    "Please add a testnet private key to deploy your external gateway with in the .env file in ./axelar-contract-deployments"
  );
}

export async function setupIntegration() {
  await downloadAxelard();
  const srcGateway = await source.source_gateway_deployment();
  srcGateway
    ? axelar.instantiateContracts(srcGateway)
    : console.error("src gateway undefined");

  console.log(
    "Please fill out form here: https://docs.google.com/forms/d/e/1FAIpQLSchD7P1WfdSCQfaZAoqX7DyqJOqYKxXle47yrueTbOgkKQDiQ/viewform"
  );
  console.log("npm run test-integration");
}

export async function testIntegration() {
  axelar.updateVerifierSet();
  source.rotate_signers(axelar.getWorkerSetProof());
  axelar.supplyRewards();
  // verifier.run_ampd()
  source.create_tx(); // Ben
  axelar.verifyMessages();
  axelar.routeMessages();
  axelar.constructProof();
  source.approve_messages(axelar.getMessageProof());
  source.execute();
  axelar.distributeRewards();
}

export async function setupVerifier(network = "verifiers") {
  console.log("This script is for amplifier prerelease-5 (ampd 0.5.0)");
  verifier.checkDockerInstalled();
  await verifier.runTofnd();
  console.log("Finished setting up tofnd");
  await downloadAmpd();
  verifier.configureAmpd(network);
  await downloadAxelard();
  verifier.printVerifierAddress(network);
  verifier.bondAndRegister(network);
  console.log("Finished setting up verifier");
  console.log("Now fill out the form here:");
  console.log(
    "https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform"
  );
  // TODO remove this exit by clean up tofnd dangling
}

export async function rotateVerifierKeys() {
  axelar.updateVerifierSet();
  // Call UpdateVerifierSet on Multisig Prover of target chain
  // axelard tx wasm execute axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2 '"update_verifier_set"'     --keyring-backend test     --from wallet     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier   --node http://devnet-verifiers.axelar.dev:26657
  // ^^^^ requires admin now (or governance)

  // axelard q wasm contract-state smart axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2 '{"get_proof":{"multisig_session_id":"16"}}' --node http://devnet-verifiers.axelar.dev:26657

  // Look for wasm-proof_under_construction event's sessionId
  source.rotate_signers(axelar.getWorkerSetProof());
}
