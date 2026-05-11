import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";
import { http } from "viem";

// Get a free project id at https://cloud.reown.com (formerly WalletConnect Cloud).
// Until you set NEXT_PUBLIC_WC_PROJECT_ID, WalletConnect-based wallets (Rainbow,
// Trust, etc.) will not function in this app. MetaMask works regardless.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "PLACEHOLDER";

const rpcMainnet = process.env.NEXT_PUBLIC_MAINNET_RPC;

export const config = getDefaultConfig({
  appName: "PICK",
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: rpcMainnet ? http(rpcMainnet) : http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});
