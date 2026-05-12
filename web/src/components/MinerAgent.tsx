"use client";

import { useAccount, useReadContract } from "wagmi";
import Image from "next/image";
import { DAEMON_ADDRESS, DAEMON_SYMBOL } from "@/lib/contract";
import { daemonAbi } from "@/lib/daemonAbi";
import { formatUnits } from "viem";

/**
 * Preview section for the Miner Agent ERC-721 collection. Renders the four
 * tier artworks side-by-side and, if the visitor has connected a wallet
 * holding DMN, highlights the tier they would qualify for right now.
 *
 * Claim button is intentionally disabled here: MinerAgent.sol won't be
 * deployed against the production Daemon until after the trial succeeds.
 * Once that happens, swap the address constant + flip CLAIM_LIVE to true.
 */

const CLAIM_LIVE = false;

const TIERS = [
  {
    key: "initiate",
    name: "Initiate",
    image: "/nft/initiate.png",
    threshold: "< 1,000",
    description: "Holding less than 1,000 " + DAEMON_SYMBOL,
    minWei: 0n,
  },
  {
    key: "bronze",
    name: "Bronze",
    image: "/nft/bronze.png",
    threshold: "1k – 9.9k",
    description: "Holding between 1,000 and 9,999 " + DAEMON_SYMBOL,
    minWei: 1_000n * 10n ** 18n,
  },
  {
    key: "silver",
    name: "Silver",
    image: "/nft/silver.png",
    threshold: "10k – 99.9k",
    description: "Holding between 10,000 and 99,999 " + DAEMON_SYMBOL,
    minWei: 10_000n * 10n ** 18n,
  },
  {
    key: "gold",
    name: "Gold",
    image: "/nft/gold.png",
    threshold: "≥ 100k",
    description: "Holding 100,000 or more " + DAEMON_SYMBOL,
    minWei: 100_000n * 10n ** 18n,
  },
] as const;

function tierIndexFor(balance: bigint): number {
  if (balance >= TIERS[3].minWei) return 3;
  if (balance >= TIERS[2].minWei) return 2;
  if (balance >= TIERS[1].minWei) return 1;
  return 0;
}

export function MinerAgent() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: DAEMON_ADDRESS,
    abi: daemonAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const userBalance = (balance as bigint | undefined) ?? 0n;
  const currentTier = isConnected ? tierIndexFor(userBalance) : -1;
  const eligible = userBalance >= 10n ** 18n; // 1 DMN minimum

  return (
    <section className="panel p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-mono text-xl">miner agent NFT</h2>
        <span
          className="font-mono text-xs"
          style={{ color: "var(--fg-muted)" }}
        >
          soulbound · ERC-8004 · on-chain tier
        </span>
      </div>

      <p
        className="text-sm mb-4 max-w-3xl"
        style={{ color: "var(--fg-muted)" }}
      >
        One badge per address, permanently bound to the wallet that claims it.
        The artwork is decided dynamically by your live {DAEMON_SYMBOL} holdings — the NFT
        visibly upgrades as you accumulate. Minimum 1 {DAEMON_SYMBOL} held to claim.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {TIERS.map((t, i) => {
          const isCurrent = i === currentTier;
          return (
            <div
              key={t.key}
              className="rounded-sm overflow-hidden flex flex-col"
              style={{
                border: isCurrent
                  ? "2px solid var(--accent)"
                  : "1px solid var(--border)",
                background: "var(--bg-elevated)",
                boxShadow: isCurrent
                  ? "0 0 22px var(--accent-glow)"
                  : "none",
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
              }}
            >
              <div
                className="relative w-full"
                style={{ aspectRatio: "1 / 1", background: "#000" }}
              >
                <Image
                  src={t.image}
                  alt={`${t.name} tier sigil`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  style={{ objectFit: "contain" }}
                  priority={t.key === "initiate" || t.key === "gold"}
                />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span
                    className="font-mono text-sm"
                    style={{
                      color: isCurrent ? "var(--accent)" : "var(--fg)",
                      fontWeight: isCurrent ? 700 : 500,
                    }}
                  >
                    {t.name}
                  </span>
                  {isCurrent && (
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: "var(--accent-glow)",
                        color: "var(--accent)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      YOU
                    </span>
                  )}
                </div>
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {t.threshold} {DAEMON_SYMBOL}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center justify-between gap-3 flex-wrap rounded-sm p-3"
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="font-mono text-xs space-y-1">
          {isConnected ? (
            <>
              <div>
                <span style={{ color: "var(--fg-muted)" }}>your balance:</span>{" "}
                <span style={{ color: "var(--fg)" }}>
                  {Number(formatUnits(userBalance, 18)).toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {DAEMON_SYMBOL}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--fg-muted)" }}>
                  qualifies for:
                </span>{" "}
                <span
                  style={{
                    color: eligible ? "var(--accent)" : "var(--fg-muted)",
                  }}
                >
                  {eligible ? TIERS[currentTier].name : "not eligible (need ≥ 1 " + DAEMON_SYMBOL + ")"}
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--fg-muted)" }}>
              connect a wallet to preview your tier
            </div>
          )}
        </div>

        <button
          disabled={!CLAIM_LIVE}
          className="btn"
          style={{
            opacity: CLAIM_LIVE ? 1 : 0.55,
            cursor: CLAIM_LIVE ? "pointer" : "not-allowed",
          }}
          title={
            CLAIM_LIVE
              ? "claim your agent NFT"
              : "MinerAgent contract is deployed only after the production Daemon launch"
          }
        >
          {CLAIM_LIVE ? "claim agent NFT" : "claim — live after production deploy"}
        </button>
      </div>

      <p
        className="font-mono text-[11px] mt-3"
        style={{ color: "var(--fg-dim)" }}
      >
        See the full capability manifest at{" "}
        <a
          href="/agent.json"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)" }}
          className="hover:underline"
        >
          /agent.json
        </a>
        . Metadata resolves dynamically per token via the on-chain ownerOf()
        lookup → live balance check → tier image, so the badge reflects the
        wallet's current standing instead of a snapshot frozen at mint time.
      </p>
    </section>
  );
}
