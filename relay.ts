import { run } from "./helpers";

// const AXELAR_CHAIN_GATEWAY_CONTRACT =
//   "axelar17llq4ch6xwwmmpz2uc0qgyqs0mruhd5888a49n50z79q3cdrceushfjq3h";
// const CHAIN_NAME = "ethereum-sepolia";
// const TX_HASH =
//   "0xc9eb0d116e1f79511f039cc58a3a531f72e704bc18a46d370de160941372bcc3-157";
// const TX_EVENT = "157";
// const DESTINATION_CHAIN = "avalanche";
// const DESTINATION_ADDRESS = "0xaE706DD03e8A57214E6f1d39c6aa58C4A326bca4";
// const SOURCE_ADDRESS = "0x3E77Fd1B4d4176CA9d54dB60f132FbB88BFA43CA";
// const PAYLOAD_HASH =
//   "5878734D26F288FD562CE12A277687B6243EE46B53E9DB5DF881C2D9A4DC077A";

const AXELAR_CHAIN_GATEWAY_CONTRACT =
  "axelar1vnfn0e4vnn58ydpm05wqcc9zp8t5ztwd5rw5f895lykqaezmuccqujmwl2";
const CHAIN_NAME = "avalanche";
const TX_HASH =
  "0x711f8485591d0350dc87f9cb1e807887b91c3fc197f15b95e692a5170146113f";
const TX_EVENT = "0";
const DESTINATION_CHAIN = "ethereum-sepolia";
const DESTINATION_ADDRESS = "0x8f8dedd09E23E22E1555e9D2C25D7c7332291919";
const SENDER = "0x0a3b8dc7706c47b6dd87d771df63875b1c5cd867";
const PAYLOAD_HASH =
  "220f68445e3cec114bff50cd6b251e3deabc7684b10280c2116b20bcc6795a96";

let cmd = `./axelard tx wasm execute ${AXELAR_CHAIN_GATEWAY_CONTRACT}   '{"verify_messages":
[
     {
         "cc_id":{
             "chain":"${CHAIN_NAME}",
             "id":"${TX_HASH}-${TX_EVENT}"
         },
         "destination_chain":"${DESTINATION_CHAIN}",
         "destination_address":"${DESTINATION_ADDRESS}",
         "source_address":"${SENDER}",
         "payload_hash":"${PAYLOAD_HASH}"
     }
 ]
}'  --keyring-backend test  --from wallet  --gas auto --gas-adjustment 1.5  --gas-prices 0.007uverifiers    --node http://devnet-verifiers.axelar.dev:26657
`;
console.log("cmd is:", cmd);
run(cmd, "relay a message from fuji via devnet-verifiers gateway");
