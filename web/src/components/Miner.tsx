"use client";

import { useAccount, useReadContract } from "wagmi";
import { pickAbi } from "@/lib/pickAbi";
import { PICK_ADDRESS } from "@/lib/contract";

// Placeholder until the Rust → WASM miner is wired in. The full integration
// will hash keccak256(challenge, nonce) on N workers (navigator.hardwareConcurrency)
// and call mine(nonce) on the first solution that satisfies currentDifficulty.
export function Miner() {
  const { address, isConnected } = useAccount();

  const { data: genesis } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "genesisState",
    query: { refetchInterval: 12_000 },
  });
  const complete = (genesis as readonly [bigint, bigint, bigint, boolean] | undefined)?.[3] ?? false;

  const { data: challenge } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "getChallenge",
    args: address ? [address] : undefined,
    query: { enabled: !!address && complete, refetchInterval: 12_000 },
  });

  return (
    <div id="mine" className="panel p-6 space-y-4">
      <div>
        <div className="panel-label">mining</div>
        <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
          Each wallet gets its own challenge: solutions are unstealable from
          the mempool. The miner runs in your browser via WASM workers across
          all your CPU cores.
        </p>
      </div>

      {!complete && (
        <div className="font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
          Mining opens once genesis is complete and the V4 pool has been
          seeded.
        </div>
      )}

      {complete && !isConnected && (
        <div className="font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
          Connect a wallet to receive your per-address challenge.
        </div>
      )}

      {complete && isConnected && (
        <>
          <div className="panel p-3" style={{ background: "var(--bg)" }}>
            <div className="panel-label">your challenge</div>
            <div className="font-mono text-xs mt-1 break-all"
                 style={{ color: "var(--fg-muted)" }}>
              {challenge as `0x${string}` | undefined ?? "loading…"}
            </div>
          </div>

          <button disabled className="btn btn-primary w-full">
            start mining (WASM coming next)
          </button>

          <div className="text-xs font-mono" style={{ color: "var(--fg-dim)" }}>
            The Rust → WASM miner ships in the next iteration. For now you can
            mint genesis above.
          </div>
        </>
      )}
    </div>
  );
}
