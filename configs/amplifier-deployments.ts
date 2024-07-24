export const AMPLIFIER_CONFIG: {
  [network: string]: {
    ROUTER: string;
    MULTISIG: string;
    CURRENCY: string;
    REWARDS: string;
    RPC: string;
    EXTERNAL_FUJI_GATEWAY: string;
    SEPOLIA_GATEWAY: string;
  };
} = {
  "devnet-verifiers": {
    ROUTER: "axelar1q3g7fdqfpftqfpuakwn7x037k80wv35jj9ged7v5e798pds7hnasgj6azz",
    MULTISIG:
      "axelar15nczwuqh0zcu6syeqsc4td6dphql7n2p7cgkl9raz97z5s3zdjrsc8we9y",
    CURRENCY: "uverifiers",
    REWARDS:
      "axelar1guczj53xxl4347adagh23eelyhnxvugw2nqq0q0dr6kws7q35jyqqnan33",
    RPC: "http://devnet-verifiers.axelar.dev:26657",
    EXTERNAL_FUJI_GATEWAY: "0x8a2DB90356402a00dbfFeeF2629F590B4929Df5F",
    SEPOLIA_GATEWAY:
      "axelar17llq4ch6xwwmmpz2uc0qgyqs0mruhd5888a49n50z79q3cdrceushfjq3h",
  },
  "devnet-amplifier": {
    ROUTER: "axelar14jjdxqhuxk803e9pq64w4fgf385y86xxhkpzswe9crmu6vxycezst0zq8y",
    MULTISIG:
      "axelar19jxy26z0qnnspa45y5nru0l5rmy9d637z5km2ndjxthfxf5qaswst9290r",
    CURRENCY: "uamplifier",
    REWARDS:
      "axelar1vaj9sfzc3z0gpel90wu4ljutncutv0wuhvvwfsh30rqxq422z89qnd989l",
    RPC: "http://devnet-amplifier.axelar.dev:26657",
    EXTERNAL_FUJI_GATEWAY: "0x146cbBBD1D03DA0619baa96Ed1d145A549959499",
    SEPOLIA_GATEWAY:
      "axelar1hdx49xndyxzrs3t5jkzart00taqysu6kmaf77waxv8regwxxpp4qcsea2w",
  },
};
