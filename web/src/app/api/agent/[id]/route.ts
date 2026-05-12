// Dynamic per-token metadata endpoint for the MinerAgent (ERC-8004) NFT.
//
// The Solidity contract concatenates the configured base URI with the
// tokenId and ".json":
//
//   tokenURI(N) = externalBaseURI || N || ".json"
//
// So once `setExternalBaseURI("https://<domain>/api/agent/")` is called on
// MinerAgent post-deploy, every NFT resolves to
//
//   https://<domain>/api/agent/<N>.json
//
// which routes here. We then read the owner's current DMN balance on-chain,
// pick the matching tier (Initiate / Bronze / Silver / Gold), and return an
// OpenSea-compatible JSON pointing at the static tier PNG in /public/nft.
//
// This is the "Option B" architecture: designer art frozen as four
// immutable PNGs, but the tier the NFT *displays* is recomputed live from
// chain state — so a wallet that grows from Bronze to Gold visibly upgrades.

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";
import { mainnet, sepolia } from "viem/chains";

// ───────── Configuration ─────────
// These must be set as env vars after each mainnet (or sepolia test) deploy.
// We deliberately don't hardcode addresses so the same code can serve both
// chains with separate Netlify deploy contexts if needed.
const CHAIN_ID = Number(process.env.NFT_CHAIN_ID ?? "1");
const CHAIN = CHAIN_ID === 11155111 ? sepolia : mainnet;
const RPC_URL =
  process.env.NFT_RPC_URL ?? (CHAIN_ID === 11155111
    ? "https://rpc.sepolia.org"
    : "https://eth.llamarpc.com");

const DAEMON_ADDRESS = (process.env.NFT_DAEMON_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
const MINER_AGENT_ADDRESS = (process.env.NFT_MINER_AGENT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const client = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

const minerAgentAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

const daemonAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

// ───────── Tier definitions (mirror MinerAgent._tier) ─────────
type Tier = {
  name: string;
  /** Decentralized IPFS URI — let the consuming marketplace (OpenSea,
   * MetaMask, Rarible, etc.) resolve through its preferred gateway. */
  image: string;
  /** Hex color with leading "#", used for OpenSea trait swatch */
  color: string;
  /** Same color WITHOUT leading "#", OpenSea spec for background_color */
  bg: string;
  /** Minimum DMN held to qualify for this tier */
  minDmn: number;
};

// Pinata-pinned CIDv1 raw-codec hashes of the four tier artworks. The
// content is content-addressed, so the CIDs are an immutable proof the
// image never changed since pinning. Even if Pinata removes the pin,
// anyone re-pinning the same PNG to IPFS gets the identical CID.
const TIERS = {
  gold: {
    name: "Gold",
    image: "ipfs://bafkreidcfqawzolh6rxc4hl2qq43cagmwgqwr5xjo5wnubrho7etrhu724",
    color: "#f4c430",
    bg: "0e0a02",
    minDmn: 100_000,
  },
  silver: {
    name: "Silver",
    image: "ipfs://bafkreiflpuppfyebzcyerk2libizrdosklefg46ztnyymvsvmwnnsdgv24",
    color: "#c0c0c8",
    bg: "0c0c10",
    minDmn: 10_000,
  },
  bronze: {
    name: "Bronze",
    image: "ipfs://bafkreigihsvsazqdyuykw4xsphzlhw6vgmd6is7so4y56s27ivmb7u4leq",
    color: "#cd7f32",
    bg: "0e0801",
    minDmn: 1_000,
  },
  initiate: {
    name: "Initiate",
    image: "ipfs://bafkreifzpzicqem3o5rpcxgvxcz5xuj7tw5nfm7pde5l4ejsc4kepogr2e",
    color: "#7a7a82",
    bg: "08080a",
    minDmn: 0,
  },
} as const satisfies Record<string, Tier>;

function tierFor(balance: bigint): Tier {
  if (balance >= 100_000n * 10n ** 18n) return TIERS.gold;
  if (balance >=  10_000n * 10n ** 18n) return TIERS.silver;
  if (balance >=   1_000n * 10n ** 18n) return TIERS.bronze;
  return TIERS.initiate;
}

// ───────── Handler ─────────

export const revalidate = 60; // ISR hint; we also set explicit Cache-Control

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // The contract sends `${id}.json`. Strip the suffix.
  const raw = params.id.replace(/\.json$/i, "");

  let tokenId: bigint;
  try {
    tokenId = BigInt(raw);
    if (tokenId <= 0n) throw new Error("tokenId must be positive");
  } catch {
    return NextResponse.json({ error: "Invalid tokenId" }, { status: 400 });
  }

  // Resolve current owner. Reverts if the token doesn't exist.
  let owner: `0x${string}`;
  try {
    owner = await client.readContract({
      address: MINER_AGENT_ADDRESS,
      abi: minerAgentAbi,
      functionName: "ownerOf",
      args: [tokenId],
    });
  } catch {
    return NextResponse.json(
      { error: `Agent #${tokenId} does not exist` },
      { status: 404 }
    );
  }

  // Resolve current DMN balance and pick the tier.
  const balance = await client.readContract({
    address: DAEMON_ADDRESS,
    abi: daemonAbi,
    functionName: "balanceOf",
    args: [owner],
  });

  const tier = tierFor(balance);
  const dmnHeld = Number(balance / 10n ** 18n);

  const metadata = {
    name: `Daemon Miner Agent #${tokenId}`,
    description:
      "ERC-8004 aligned identity for a DMN participant. Soulbound; the " +
      "tier badge reflects live DMN holdings of the agent wallet, so the " +
      "NFT visually upgrades as you accumulate. Minimum 1 DMN held to " +
      "claim; transfers are blocked at the contract level.",
    image: tier.image,
    // 6-char hex without "#" — OpenSea uses this as the card backdrop.
    background_color: tier.bg,
    // Per-token external link points at the holder's profile on Etherscan
    // (more useful than a generic site link for someone inspecting the NFT).
    external_url: `https://etherscan.io/address/${owner}`,
    attributes: [
      { trait_type: "Tier", value: tier.name },
      {
        trait_type: "DMN Held",
        display_type: "number",
        value: dmnHeld,
      },
      {
        trait_type: "Tier Floor",
        display_type: "number",
        value: tier.minDmn,
      },
      { trait_type: "Agent Wallet", value: owner },
      // Pure surface trait so OpenSea filters group by tier color visually.
      { trait_type: "Tier Color", value: tier.color },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      // 60s SWR — fresh enough that tier upgrades show up promptly,
      // long enough not to hammer the RPC if OpenSea re-fetches.
      "Cache-Control":
        "public, s-maxage=60, max-age=60, stale-while-revalidate=300",
    },
  });
}
