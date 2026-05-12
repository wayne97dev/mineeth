import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "viem";

// Get a free project id at https://cloud.reown.com (formerly WalletConnect Cloud).
// Until you set NEXT_PUBLIC_WC_PROJECT_ID, WalletConnect-based wallets (Rainbow,
// Trust, etc.) will not function in this app. MetaMask works regardless.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "PLACEHOLDER";

const rpcMainnet = process.env.NEXT_PUBLIC_MAINNET_RPC;
const rpcSepolia = process.env.NEXT_PUBLIC_SEPOLIA_RPC;

// Default to llamarpc when NEXT_PUBLIC_MAINNET_RPC isn't set (Netlify env
// vars haven't been wired up yet during the trial). viem's bare http() falls
// back to Cloudflare's endpoint which rate-limits multi-call read batches
// aggressively and causes the Stats component to render "Contract not
// reachable" even when the wallet is on the right chain.
const DEFAULT_MAINNET_RPC = "https://eth.llamarpc.com";
const DEFAULT_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

export const config = getDefaultConfig({
  appName: "Daemon",
  projectId,
  // Mainnet first so RainbowKit defaults to it (trial contract lives there).
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(rpcMainnet ?? DEFAULT_MAINNET_RPC),
    [sepolia.id]: http(rpcSepolia ?? DEFAULT_SEPOLIA_RPC),
  },
  ssr: true,
});
