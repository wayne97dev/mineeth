"use client";

import { useEffect, useState } from "react";
import { useWatchContractEvent } from "wagmi";
import { formatUnits, type Address } from "viem";
import { daemonAbi } from "@/lib/daemonAbi";
import { DAEMON_ADDRESS } from "@/lib/contract";

type MintEntry = {
  miner: Address;
  reward: bigint;
  era: bigint;
  txHash: `0x${string}`;
  seenAt: number; // Date.now() when we received the event
};

const MAX_VISIBLE = 8;

function shortAddr(a: Address): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function relativeTime(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function RecentMints() {
  const [mints, setMints] = useState<MintEntry[]>([]);
  const [, setTick] = useState(0);

  // Re-render every 10s so the "X ago" labels stay fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  useWatchContractEvent({
    address: DAEMON_ADDRESS,
    abi: daemonAbi,
    eventName: "Mined",
    onLogs(logs) {
      const now = Date.now();
      const fresh: MintEntry[] = logs.map((l) => {
        const args = (l as unknown as { args: { miner: Address; reward: bigint; era: bigint } }).args;
        return {
          miner: args.miner,
          reward: args.reward,
          era: args.era,
          txHash: l.transactionHash as `0x${string}`,
          seenAt: now,
        };
      });
      setMints((prev) => [...fresh.reverse(), ...prev].slice(0, MAX_VISIBLE));
    },
  });

  return (
    <div className="panel p-4">
      <div className="panel-label mb-3">recent mints</div>
      {mints.length === 0 ? (
        <div className="font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
          waiting for the next mint…
        </div>
      ) : (
        <ul className="space-y-1.5 font-mono text-sm">
          {mints.map((m, i) => (
            <li
              key={`${m.txHash}-${i}`}
              className="flex items-center justify-between gap-3"
            >
              <span>
                <span style={{ color: "var(--fg-muted)" }}>{shortAddr(m.miner)}</span>
                <span style={{ color: "var(--fg)" }}> mined </span>
                <span style={{ color: "var(--accent)" }}>
                  {formatUnits(m.reward, 18)} DMN
                </span>
              </span>
              <span style={{ color: "var(--fg-dim)" }} className="text-xs">
                {relativeTime(m.seenAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
