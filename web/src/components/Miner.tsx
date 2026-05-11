"use client";

import { useAccount, useReadContract } from "wagmi";
import { pickAbi } from "@/lib/pickAbi";
import { PICK_ADDRESS } from "@/lib/contract";
import { useMiner } from "@/hooks/useMiner";

function formatRate(hps: number): string {
  if (hps >= 1_000_000) return `${(hps / 1_000_000).toFixed(2)} MH/s`;
  if (hps >= 1_000) return `${(hps / 1_000).toFixed(1)} kH/s`;
  return `${hps.toFixed(0)} H/s`;
}

export function Miner() {
  const { isConnected } = useAccount();

  const { data: genesis } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "genesisState",
    query: { refetchInterval: 12_000 },
  });
  const complete = (genesis as readonly [bigint, bigint, bigint, boolean] | undefined)?.[3] ?? false;

  const {
    status,
    hashrate,
    cores,
    challenge,
    error,
    txHash,
    start,
    stop,
  } = useMiner();

  const running = status === "mining" || status === "submitting" || status === "confirming";

  return (
    <div id="mine" className="panel p-6 space-y-4">
      <div>
        <div className="panel-label">mining</div>
        <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
          Each wallet gets its own challenge: solutions are unstealable from
          the mempool. The miner runs in your browser via {cores} WASM
          worker{cores > 1 ? "s" : ""}.
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
              {challenge ?? "loading…"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="panel p-3" style={{ background: "var(--bg)" }}>
              <div className="panel-label">hashrate</div>
              <div className="font-mono text-lg mt-1">
                {running ? formatRate(hashrate) : "—"}
              </div>
            </div>
            <div className="panel p-3" style={{ background: "var(--bg)" }}>
              <div className="panel-label">status</div>
              <div className="font-mono text-lg mt-1" style={{
                color:
                  status === "won" ? "var(--ok)" :
                  status === "error" ? "var(--danger)" :
                  "var(--fg)"
              }}>
                {statusLabel(status)}
              </div>
            </div>
          </div>

          {running ? (
            <button onClick={stop} className="btn w-full">
              stop mining
            </button>
          ) : (
            <button
              onClick={start}
              disabled={!challenge}
              className="btn btn-primary w-full"
            >
              start mining
            </button>
          )}

          {txHash && (
            <div className="text-xs font-mono break-all" style={{ color: "var(--fg-muted)" }}>
              tx: {txHash}
            </div>
          )}

          {error && (
            <div className="text-xs font-mono" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function statusLabel(s: ReturnType<typeof useMiner>["status"]): string {
  switch (s) {
    case "idle": return "idle";
    case "mining": return "mining…";
    case "submitting": return "submit tx";
    case "confirming": return "confirming";
    case "won": return "mined ✓";
    case "error": return "error";
  }
}
