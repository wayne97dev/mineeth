import type { Address } from "viem";

// Placeholder: replace with the actual deployed address once the mainnet
// deploy completes. The CREATE2 prediction from `forge script script/Deploy.s.sol`
// gave 0x706be6AC92f5a9b287292ec72F2D37381448a0Cc but this is sensitive to
// any change in initCode (token name, constructor args, compiler settings).
// Recompute the prediction immediately before deploying.
export const PICK_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export const PICK_DECIMALS = 18;
export const PICK_SYMBOL = "PICK";

// V4 mainnet — used to display pool info, not required for contract reads.
export const POOL_MANAGER_ADDRESS: Address =
  "0x000000000004444c5dc75cB358380D2e3dE08A90";
