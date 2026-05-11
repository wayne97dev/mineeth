import type { Address } from "viem";

// Current testnet deployment (Sepolia, chainId 11155111). Block 10834446.
// Mainnet deploy will use a different address (different V4 constructor args
// produce a different CREATE2 init-code hash → different salt+address).
export const PICK_ADDRESS: Address = "0xa542e6d175cdbF24BCf2aa65a6E0d3496D4d60cC";

export const PICK_DECIMALS = 18;
export const PICK_SYMBOL = "PICK";

// V4 mainnet — used to display pool info, not required for contract reads.
export const POOL_MANAGER_ADDRESS: Address =
  "0x000000000004444c5dc75cB358380D2e3dE08A90";
