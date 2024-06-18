import * as verifier from './verifier'
import * as source from './source'
import * as axelar from './axelar'
import { downloadAmpd, downloadAxelard } from './helpers'
import { run } from './helpers'
import { existsSync } from 'fs'

const action = process.argv[2];
if (!action) {
  console.log("please specify an action, `integrator`, `verifier` or `tx`");
  process.exit(1);
}
console.log("Running", action, "workflow");
const network =
  process.argv.indexOf("--amplifier") === -1 ? "verifiers" : "amplifier";
switch (action) {
  case 'setupDeployment':
    setupDeployer()
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

// // Determine the action based on command line arguments
// let action = 'verifier'; // Default action
// if (process.argv.indexOf('integrator') !== -1) {
//   action = 'integrator';
// } else if (process.argv.indexOf('setupDeployment') !== -1) {
//   action = 'setupDeployment';
// }

// console.log('Running', action, 'workflow');

// // Execute the appropriate setup function based on the action
// if (action === 'integrator') {
//   setupIntegration();
// } else if (action === 'setupDeployment') {
//   setupDeployer();
// } else {
//   const network = process.argv.indexOf('--amplifier') === -1 ? 'verifiers' : 'amplifier';
//   setupVerifier(network);
}

//setup gateway deployment
export async function setupDeployer() {
  console.log('Downloading gateway deployer via git...')

  const clearFlag = process.argv.indexOf('--clear') === -1 ? false : true
  if (clearFlag)
    run('rm -rf axelar-contract-deployments', 'remove and replace old repo')

  if (!existsSync('axelar-contract-deployments')) {
    run(
      'git clone https://github.com/axelarnetwork/axelar-contract-deployments',
      'clone repo'
    )
    run(
      `cd axelar-contract-deployments;npm i`,
      'install dependencies'
    )
    console.log('gateway deployer downloaded')
    console.log('please add a private key to ./axelar-contract-deployments repo in a new .env file')
  }
}

export async function setupIntegration() {
  await downloadAxelard()
  // source.source_gateway_deployment() // Ben
  axelar.instantiateContracts()

  console.log(
    'Please fill out form here: https://docs.google.com/forms/d/e/1FAIpQLSchD7P1WfdSCQfaZAoqX7DyqJOqYKxXle47yrueTbOgkKQDiQ/viewform'
  )
  console.log('npm run test-integration')
}

export async function testIntegration() {
  axelar.updateWorkerSet()
  source.rotate_signers(axelar.getWorkerSetProof())
  axelar.supplyRewards()
  // verifier.run_ampd()
  source.create_tx() // Ben
  axelar.verifyMessages()
  axelar.routeMessages()
  axelar.constructProof()
  source.approve_messages(axelar.getMessageProof())
  source.execute()
  axelar.distributeRewards()
}

export async function setupVerifier(network = 'verifiers') {
  console.log('This script is for amplifier prerelease-4 (ampd 0.4.0)')
  verifier.checkDockerInstalled()
  await verifier.runTofnd()
  console.log('Finished setting up tofnd')
  await downloadAmpd()
  verifier.configureAmpd(network)
  await downloadAxelard()
  verifier.printVerifierAddress(network)
  verifier.bondAndRegister(network)
  console.log('Finished setting up verifier')
  console.log('Now fill out the form here:')
  console.log(
    'https://docs.google.com/forms/d/e/1FAIpQLSfQQhk292yT9j8sJF5ARRIE8PpI3LjuFc8rr7xZW7posSLtJA/viewform'
  )
  // TODO remove this exit by clean up tofnd dangling
}
