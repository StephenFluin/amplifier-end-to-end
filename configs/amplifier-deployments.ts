// Fetch and return the config for the selected network.
let cache: { [network: string]: any } = {};
export async function getConfig(network: string) {
  if (!cache[network]) {
    cache[network] = await (
      await fetch(
        `https://raw.githubusercontent.com/axelarnetwork/axelar-contract-deployments/main/axelar-chains-config/info/${network}.json`
      )
    ).json();
  }
  return cache[network];
}
