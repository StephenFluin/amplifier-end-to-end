import * as verifier from "./verifier";
import * as source from "./source";
import * as axelar from "./axelar";

const network =
  process.argv.indexOf("--amplifier") === -1 ? "verifiers" : "amplifier";

setupVerifier(network);

export async function setupIntegration() {}
//   source.deploy_source_gateway()  # Ben
//   axelar.instantiate_contracts()

//     print(
//         "Please fill out form here: https://docs.google.com/forms/d/e/1FAIpQLSchD7P1WfdSCQfaZAoqX7DyqJOqYKxXle47yrueTbOgkKQDiQ/viewform"
//     )
//     setup_verifier()
//     print(
//         "Once you've been approved for both of these allow-lists, run the following command:"
//     )
//     print("python3 main.py test-integration")
//     # wait for finish
export async function testIntegration() {
  axelar.update_worker_set();
  source.rotate_signers(axelar.get_worker_set_proof());
  axelar.supply_rewards();
  // verifier.run_ampd()
  source.create_tx(); // Ben
  axelar.verify_messages();
  axelar.route_messages();
  axelar.construct_proof();
  source.approve_messages(axelar.get_message_proof());
  source.execute();
  axelar.distribute_rewards();
}

export async function setupVerifier(network = "verifiers") {
  verifier.checkDockerInstalled();
  let prom = await verifier.runTofnd();
  console.log("Finished setting up tofnd");
  await verifier.downloadAmpd();
  verifier.configureAmpd(network);
  await verifier.downloadAxelard();
  verifier.printVerifierAddress(network);
  verifier.bondAndRegister(network);
  console.log("Finished setting up verifier");
  console.log("Now fill out the form here:");
  console.log(
    "https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform"
  );
}
