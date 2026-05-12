import type { Address } from "viem";

// Mainnet TRIAL deployment — temporary contract used to validate the full
// V4 lifecycle (mintGenesis → partialSeed → swap → claimFees) before the
// production deploy. ERC20 name/symbol on-chain are "Daemon Test"/"DMNT",
// chosen so the CREATE2 init-code hash and final address are intentionally
// different from the eventual production "Daemon"/"DMN" deploy.
// Block: 25080616. tx: 0xd383f9980d803345e9865d1afda455be75b58b388f59f20008de2fe32a220e63
export const DAEMON_ADDRESS: Address = "0x19441fFD2c205549343ffa0491fff7Ce3a20a0Cc";

export const DAEMON_DECIMALS = 18;
export const DAEMON_SYMBOL = "DMNT";

// MinerAgent ERC-721 contract address. Filled in after production deploy
// (the trial Daemon does not have a paired MinerAgent — see CLAIM_LIVE in
// MinerAgent.tsx). Leave as zero-address until then.
export const MINER_AGENT_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

// V4 mainnet — used to display pool info, not required for contract reads.
export const POOL_MANAGER_ADDRESS: Address =
  "0x000000000004444c5dc75cB358380D2e3dE08A90";
