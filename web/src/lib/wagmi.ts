import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "viem";

// Get a free project id at https://cloud.reown.com (formerly WalletConnect Cloud).
// Until you set NEXT_PUBLIC_WC_PROJECT_ID, WalletConnect-based wallets (Rainbow,
// Trust, etc.) will not function in this app. MetaMask works regardless.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "PLACEHOLDER";

const rpcMainnet = process.env.NEXT_PUBLIC_MAINNET_RPC;
const rpcSepolia = process.env.NEXT_PUBLIC_SEPOLIA_RPC;

export const config = getDefaultConfig({
  appName: "Daemon",
  projectId,
  // Mainnet first so RainbowKit defaults to it (trial contract lives there).
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: rpcMainnet ? http(rpcMainnet) : http(),
    [sepolia.id]: rpcSepolia ? http(rpcSepolia) : http(),
  },
  ssr: true,
});
