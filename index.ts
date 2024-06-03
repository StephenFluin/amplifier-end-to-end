import * as verifier from "./verifier";
import * as source from "./source";
import * as axelar from "./axelar";
import { downloadAmpd, downloadAxelard } from "./helpers";

const action =
  process.argv.indexOf("integrator") === -1 ? "verifier" : "integrator";
console.log("Running", action, "workflow");
if (action === "integrator") {
  setupIntegration();
} else {
  const network =
    process.argv.indexOf("--amplifier") === -1 ? "verifiers" : "amplifier";
  setupVerifier(network);
}
export async function setupIntegration() {
  await downloadAxelard();
  source.deploy_source_gateway(); // Ben
  axelar.instantiateContracts();

  console.log(
    "Please fill out form here: https://docs.google.com/forms/d/e/1FAIpQLSchD7P1WfdSCQfaZAoqX7DyqJOqYKxXle47yrueTbOgkKQDiQ/viewform"
  );
  console.log("npm run test-integration");
}
export async function testIntegration() {
  axelar.updateWorkerSet();
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
  verifier.checkDockerInstalled();
  let prom = await verifier.runTofnd();
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
}
