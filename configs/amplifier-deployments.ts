// Fetch and return the config for the selected network.
let cache: { [network: string]: any } = {};
export async function getConfig(network: string) {
  if (!cache[network]) {
    const path = `https://raw.githubusercontent.com/axelarnetwork/axelar-contract-deployments/main/axelar-chains-config/info/${network}.json`;

    try {
      cache[network] = await (await fetch(path)).json();
    } catch (error: any) {
      console.error("Couldn't download config file from github", path, error);
      process.exit(1);
    }
  }
  return cache[network];
}
/** Chain finalities in seconds */
export const FINALITIES: { [key: string]: number } = {
  axelar: 20, // Not really finality, time for poll completion
  "ethereum-sepolia": 17 * 60,
  "test-sepolia": 17 * 60,
  avalanche: 35,
  "test-avalanche": 35,
  "op-sepolia": 32 * 60,
};
