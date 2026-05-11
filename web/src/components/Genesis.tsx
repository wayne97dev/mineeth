"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther } from "viem";
import { pickAbi } from "@/lib/pickAbi";
import { PICK_ADDRESS } from "@/lib/contract";

const PRICE_PER_UNIT_ETH = 0.01;
const TOKENS_PER_UNIT = 1000;
const MAX_UNITS_PER_TX = 5;

export function Genesis() {
  const { isConnected } = useAccount();
  const [units, setUnits] = useState(1);

  const { data: genesis } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "genesisState",
    query: { refetchInterval: 12_000 },
  });
  const complete = (genesis as readonly [bigint, bigint, bigint, boolean] | undefined)?.[3] ?? false;

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (complete) {
    return (
      <div id="genesis" className="panel p-6">
        <div className="panel-label mb-2">genesis</div>
        <div className="font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
          Genesis is complete. The V4 pool has been seeded — head to the mining
          section below.
        </div>
      </div>
    );
  }

  const cost = (PRICE_PER_UNIT_ETH * units).toFixed(2);
  const tokens = TOKENS_PER_UNIT * units;

  function handleMint() {
    writeContract({
      address: PICK_ADDRESS,
      abi: pickAbi,
      functionName: "mintGenesis",
      args: [BigInt(units)],
      value: parseEther(cost),
    });
  }

  return (
    <div id="genesis" className="panel p-6 space-y-4">
      <div>
        <div className="panel-label">genesis mint</div>
        <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
          Buy raw PICK at the fixed pre-pool rate of{" "}
          <span className="font-mono" style={{ color: "var(--fg)" }}>
            0.01 ETH per 1,000 PICK
          </span>
          . Max {MAX_UNITS_PER_TX} units per tx. The ETH you spend funds the V4
          liquidity pool that goes live after genesis sells out.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="panel-label">units</label>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3, 4, 5].map((u) => (
              <button
                key={u}
                onClick={() => setUnits(u)}
                className={`btn flex-1 ${units === u ? "btn-primary" : ""}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm font-mono pt-2 border-t"
           style={{ borderColor: "var(--border)" }}>
        <div>
          <span style={{ color: "var(--fg-muted)" }}>cost: </span>
          <span>{cost} ETH</span>
        </div>
        <div className="text-right">
          <span style={{ color: "var(--fg-muted)" }}>you get: </span>
          <span style={{ color: "var(--accent)" }}>{String(tokens).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} PICK</span>
        </div>
      </div>

      <button
        onClick={handleMint}
        disabled={!isConnected || isPending || isMining}
        className="btn btn-primary w-full"
      >
        {!isConnected
          ? "connect wallet to mint"
          : isPending
            ? "confirm in wallet…"
            : isMining
              ? "mining tx…"
              : isSuccess
                ? "minted ✓ (mint more?)"
                : `mint ${units} unit${units > 1 ? "s" : ""}`}
      </button>

      {error && (
        <div className="text-xs font-mono" style={{ color: "var(--danger)" }}>
          {error.message.split("\n")[0]}
        </div>
      )}
    </div>
  );
}
