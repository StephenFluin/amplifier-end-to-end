axelard tx wasm execute axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2\
  '{"update_verifier_set": []}'   \
    --keyring-backend test     --from wallet    \
     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier  \
      --node http://devnet-verifiers.axelar.dev:26657


UpdateAdmin {
        new_admin_address: String,
    }



axelard tx wasm execute axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2\
  '{"update_admin": {"new_admin_address": "axelar1qt0gkcrvcpv765k8ec4tl2svvg6hd3e3td8pvg2fsncrt3dzjefswsq3w2"}}'   \
    --keyring-backend test     --from wallet    \
     --gas auto --gas-adjustment 1.5 --gas-prices 0.007uamplifier  \
      --node http://devnet-verifiers.axelar.dev:26657


UpdateAdmin {
        new_admin_address: String,
    }