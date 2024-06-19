import * as axelar from "./axelar";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { AxelarGatewayABI } from "./axelar-gateway";
import { run } from './helpers'
import { existsSync } from 'fs'
import { exec } from 'child_process';
import { promisify } from 'util';


const execAsync = promisify(exec);

/**
 * Functions for interacting with the chain being integrated (source/destination)
 */
export async function source_gateway_deployment() {
    if (existsSync('axelar-contract-deployments')) {
        console.log('Deploying gateway on sepolia')
        const { stdout, stderr } = await execAsync(
            `cd axelar-contract-deployments && node evm/deploy-amplifier-gateway.js --env devnet-amplifier --minimumRotationDelay 300 -n ethereum-sepolia --domainSeparator "0x5034999c74b28c4db74dca67073b78629cc0ff7bf005f2f79cd8caf7d9588406"`
        );
        const gatewayImplementationRegex = /Gateway Implementation:\s+(\S+)/;
        const match = stdout.match(gatewayImplementationRegex);
        if (match) {
            const gatewayImplementationAddress = match[1];
            console.log('Src gateway deployed on sepolia at address:', gatewayImplementationAddress);
            return gatewayImplementationAddress
        } else {
            console.error('Gateway Implementation Address not found');

        }
        if (stderr) console.error('Deployment Errors:', stderr);

    } else {
        console.log('deployer not setup please run npm run setup-deployment')
    }
}
export function rotate_signers(proof: any) {}
export function create_tx() {
  const sourceGatewayAddress = "0x2A8465a312ebBa54D774972f01D64574a5acFC63";
  const destinationChain = "avalanche";
  const destinationContractAddress =
    "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4";

  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string"],
    ["Hello, World!"]
  );

  callContract(
    sourceGatewayAddress,
    destinationChain,
    destinationContractAddress,
    payload
  )
    .then((tx) => {
      console.log("transaction successful", tx);
    })
    .catch((error) => {
      console.error("Error in cross-chain call:", error);
    });
}
export function approve_messages(proof: any) {}
export function execute() {}

dotenv.config(); // Load environment variables from .env file

async function callContract(
  sourceGatewayAddress: string,
  destinationChain: string,
  destinationContractAddress: string,
  payload: string
): Promise<any> {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!privateKey || !rpcUrl) {
    throw new Error(
      "Missing PRIVATE_KEY or SEPOLIA_RPC_URL environment variables"
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  // Initialize AxelarGateway Contract
  const axelarGateway = new ethers.Contract(
    sourceGatewayAddress,
    AxelarGatewayABI, // Gateway ABI (minimum needed)
    wallet
  );

  // Construct Call Data
  const callContractArgs = [
    destinationChain,
    destinationContractAddress,
    payload,
  ];

  // Execute the Cross-Chain Call
  const gasLimit = 300000; // Estimate gas or set a reasonable limit

  const tx = await axelarGateway.callContract(...callContractArgs, {
    value: 0,
    gasLimit,
  });
  return tx;
}
