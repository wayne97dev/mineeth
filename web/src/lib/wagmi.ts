import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { fallback, http } from "viem";

// Get a free project id at https://cloud.reown.com (formerly WalletConnect Cloud).
// Until you set NEXT_PUBLIC_WC_PROJECT_ID, WalletConnect-based wallets (Rainbow,
// Trust, etc.) will not function in this app. MetaMask works regardless.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "PLACEHOLDER";

const rpcMainnet = process.env.NEXT_PUBLIC_MAINNET_RPC;
const rpcSepolia = process.env.NEXT_PUBLIC_SEPOLIA_RPC;

// Fallback chain of public RPCs: tries them in order, switches on failure.
// Keeps the site working even when NEXT_PUBLIC_MAINNET_RPC isn't set on
// Netlify (the case during the trial) — the default viem http() relies on
// Cloudflare's endpoint which rate-limits multi-call batches aggressively.
const MAINNET_PUBLIC_RPCS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
  "https://ethereum-rpc.publicnode.com",
  "https://cloudflare-eth.com",
];

const SEPOLIA_PUBLIC_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
];

export const config = getDefaultConfig({
  appName: "Daemon",
  projectId,
  // Mainnet first so RainbowKit defaults to it (trial contract lives there).
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: fallback(
      (rpcMainnet ? [http(rpcMainnet)] : []).concat(
        MAINNET_PUBLIC_RPCS.map((u) => http(u))
      )
    ),
    [sepolia.id]: fallback(
      (rpcSepolia ? [http(rpcSepolia)] : []).concat(
        SEPOLIA_PUBLIC_RPCS.map((u) => http(u))
      )
    ),
  },
  ssr: true,
});
