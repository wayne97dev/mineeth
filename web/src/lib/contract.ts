import type { Address } from "viem";

// Current testnet deployment (Sepolia, chainId 11155111). Block 10834792.
// Version with refundGenesis escape hatch (3-day grace post-deploy).
// Mainnet deploy will use a different address (different V4 constructor args
// produce a different CREATE2 init-code hash → different salt+address).
export const PICK_ADDRESS: Address = "0xf8bcf8AE88B2fd5a67d74a6eeb6c4b5A366AE0Cc";

export const PICK_DECIMALS = 18;
export const PICK_SYMBOL = "PICK";

// V4 mainnet — used to display pool info, not required for contract reads.
export const POOL_MANAGER_ADDRESS: Address =
  "0x000000000004444c5dc75cB358380D2e3dE08A90";
