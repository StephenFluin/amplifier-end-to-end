import * as verifier from "./verifier";
import * as source from "./source";
import * as axelar from "./axelar";
import { run } from "./helpers";
import { downloadAmpd, downloadAxelard } from "./helpers";

import { Command } from "commander";
import { getConfig } from "./configs/amplifier-deployments";
import { testFinality } from "./test-finality";
import { testVerifiers } from "./test-verifiers";
import { testRotation } from "./test-rotation";
export type Network = "devnet-amplifier" | "devnet-verifiers";

const program = new Command();

program.name("ae2e");
program.description(
  "Amplifier End to End - Automated end-to-end testing for Amplifier"
);
program.version("0.0.1");

program
  .command("deploy-evm-gateway")
  .description("Fetch the EVM deployer and deploy a gateway to Sepolia")
  .action(() => {
    source.setupGatewayDeployer();
    source.deployGatewayOnSepolia();
  });

program
  .command("new-integration")
  .description("Set up a new integration")
  .option("-n, --network <network>", "network to deploy to", "devnet-amplifier")
  .option("-x, --clear", "clear contracts repo and recompile", false)
  .option(
    "-g, --evm-gateway <gateway>",
    'the EVM address of a gateway or "auto" to automatically deploy',
    "0x8a2DB90356402a00dbfFeeF2629F590B4929Df5F"
  )
  .option(
    "-c, --chain-name",
    "the name of the chain",
    "devrel" +
      new Date().toISOString().substring(0, 10) +
      "-" +
      Math.round(Math.random() * 1000)
  )
  .action(newIntegration);

program
  .command("test-integration")
  .description(
    "Test a recently completed integration by sending a message and delivering it"
  )
  .argument("<chain name>", "eg devrel2021-09-01-123")
  .argument("<external gateway>", "eg 0x098...")
  .argument("<verifier>", "address of your Amplifier verifier")
  .argument("<gateway>", "address of your Amplifier gateway")
  .argument("<prover>", "address of your Amplifier prover")
  .option("-n, --network <network>", "network to deploy to", "devnet-amplifier")
  .action(testIntegration);

program
  .command("new-verifier")
  .description("Set up a new verifier")
  .option("-n, --network <network>", "network to deploy to", "devnet-verifiers")
  .option("-x, --clear", "clear running containers")
  .action((options) => {
    newVerifier(options);
  });

program
  .command("test-verifiers")
  .description(
    "Run a test transaction from Fiji->Sepolia and report on successful verifiers"
  )
  .action(testVerifiers);

program
  .command("test-finality")
  .description(
    "Run a test transaction from Sepolia->Fiji and try to relay and have verifiers vote before finality"
  )
  .action(testFinality);

program
  .command("test-rotation")
  .description(
    "Rotate keys on a chain and relay that rotation to the external gateway."
  )
  .option("-c, --chain <chain>", "target chain", "avalanche")
  .option("-n, --network <network>", "network to deploy to", "devnet-verifiers")
  .option("-m, --multisig-session-id <id>", "multisig session id")
  .action(testRotation);

program.parse(process.argv);

export async function newIntegration(options: any) {
  console.log("Setting up new integration with options:", options);

  let externalGateway = options.evmGateway;

  if (externalGateway === "auto") {
    source.setupGatewayDeployer();
    externalGateway = await source.deployGatewayOnSepolia();
    if (!externalGateway) {
      console.error(
        "Failed to deploy gateway on Sepolia, stopping integration setup"
      );
      process.exit(1);
    }
  }

  if (options.clear) {
    run("rm -rf axelar-amplifier", "remove and replace old repo");
    run("rm -rf axelar-contract-deployments", "remove and replace old repo");
  }

  console.log("Setting up new chain integration for chain:", options.chainName);
  await downloadAxelard();
  const [verifier, gateway, prover] = await axelar.instantiateContracts(
    externalGateway,
    options.chainName
  );

  await printIntegratorApprovalSteps(
    options.network,
    options.chainName,
    externalGateway,
    verifier,
    gateway,
    prover
  );
}

export async function printIntegratorApprovalSteps(
  network: Network,
  chainName: string,
  externalGateway: string,
  ampVerifierAddress: string,
  ampGatewayAddress: string,
  ampProverAddress: string
) {
  const config = await getConfig(network);

  console.log(`You have three options.`);
  console.log(`1. Request whitelisting (devnet) at: `);
  console.log(
    "    https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform"
  );
  console.log("2. Authorize yourself (devnet permissioned):");

  // Approve at the Amplifier Router
  const router = config.axelar.contracts.Router.address;
  const multisig = config.axelar.contracts.Multisig.address;

  console.log(`axelard tx wasm execute ${router} \
  '{
        "register_chain": {
            "chain":"${chainName}",
            "gateway_address": "${ampGatewayAddress}",
            "msg_id_format": "hex_tx_hash_and_event_index"
        }
    }' \
  --from amplifier --gas auto --gas-adjustment 1.5 --gas-prices ${config.axelar.gasPrice}`);
  console.log(`axelard tx wasm execute ${multisig} \
  '{"authorize_caller":{"contract_address":"${ampProverAddress}"}}' \
  --from amplifier --gas auto --gas-adjustment 2 --gas-prices ${config.axelar.gasPrice}`);
  console.log("Or submit a governance proposal: https://docs.axelar.dev/");
  console.log("When you are connected, now you can test the integration with:");
  console.log(
    `ae2e test-integration ${chainName} ${externalGateway} ${ampVerifierAddress} ${ampGatewayAddress} ${ampProverAddress} -n ${network}`
  );
}

export async function testIntegration(
  chainName: string,
  externalGateway: string,
  verifier: string,
  gateway: string,
  prover: string,
  options: any
) {
  options = {
    chainName,
    externalGateway,
    verifier,
    gateway,
    prover,
    ...options,
  };
  // axelar.rotateVerifierSet();
  // source.rotate_signers(axelar.getVerifierSetProof());
  axelar.supplyRewards(options);
  // verifier.run_ampd()
  source.createTx(options);
  axelar.verifyMessages();
  axelar.routeMessages();
  axelar.constructProof();
  source.approve_messages(axelar.getMessageProof());
  source.execute();
  axelar.distributeRewards();
}

export async function newVerifier(options: any) {
  console.log("This script is for amplifier prerelease-6 (ampd 0.6.0)");

  const network = options.network;
  if (options.clear) {
    verifier.stopAllDockers();
  }
  // @TODO stephen change away from docker to binaries
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
    'https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform'
  )
  // TODO remove this exit by clean up tofnd dangling
}