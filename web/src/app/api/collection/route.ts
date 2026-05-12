// OpenSea collection-level metadata endpoint, exposed at
//
//   https://daemonerc8004.com/api/collection
//
// After the production MinerAgent deploys we call
//   MinerAgent.setExternalContractURI("https://daemonerc8004.com/api/collection")
// so OpenSea / collection aggregators pull the rich card from here instead
// of falling back to the on-chain SVG default in MinerAgent._defaultContractURI.
//
// This is a *static* response — nothing on-chain to look up. Cached
// aggressively because it changes only when we want to rebrand the collection.

import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  // OpenSea collection metadata standard:
  // https://docs.opensea.io/docs/contract-level-metadata
  const metadata = {
    name: "Daemon Miner Agent",
    description:
      "Soulbound ERC-8004 identity NFTs for $DMN participants. One per " +
      "address, claimable once a wallet holds at least 1 DMN. The tier " +
      "badge — Initiate, Bronze, Silver, Gold — is computed live from " +
      "the holder's current DMN balance, so the NFT visibly upgrades as " +
      "you accumulate. Tokens are non-transferable: a transfer attempt " +
      "reverts at the contract level. Royalties are 0% by design — these " +
      "are identity, not assets.",
    image: `${origin}/nft/collection.png`,
    banner_image: `${origin}/nft/collection.png`,
    featured_image: `${origin}/nft/gold.png`,
    external_link: "https://daemonerc8004.com",
    collaborators: [],
    // Royalty config — soulbound collection, no secondary trade signal.
    // Some marketplaces still expect these fields to be present.
    fee_recipient: "0x0000000000000000000000000000000000000000",
    seller_fee_basis_points: 0,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control":
        "public, s-maxage=3600, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
