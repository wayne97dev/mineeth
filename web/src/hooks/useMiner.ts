"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { hexToBytes, type Hex } from "viem";
import { pickAbi } from "@/lib/pickAbi";
import { PICK_ADDRESS } from "@/lib/contract";

type WorkerMsg =
  | { type: "progress"; workerId: number; hashes: bigint; elapsedMs: number; currentNonce: bigint }
  | { type: "solution"; workerId: number; nonce: bigint };

type MinerStatus =
  | "idle"
  | "mining"
  | "submitting"
  | "confirming"
  | "won"
  | "error";

// Each worker hashes BATCH_SIZE nonces before reporting back and giving the
// event loop a chance to deliver "stop" messages. Bigger = better throughput
// but slower stop latency.
const BATCH_SIZE = 50_000n;

// Spread workers across the 64-bit nonce space so they never collide.
const WORKER_STRIDE = 1n << 56n;

export function useMiner() {
  const { address, isConnected } = useAccount();

  const { data: challenge, refetch: refetchChallenge } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "getChallenge",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: difficulty } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "currentDifficulty",
    query: { refetchInterval: 24_000 },
  });

  const [status, setStatus] = useState<MinerStatus>("idle");
  const [hashrate, setHashrate] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workersRef = useRef<Worker[]>([]);
  const totalHashesRef = useRef<bigint>(0n);
  const rateWindowRef = useRef<{ hashes: bigint; t0: number } | null>(null);

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<Hex | undefined>();
  const { isLoading: isConfirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Once the tx confirms, flip status → won, refresh challenge for next round.
  useEffect(() => {
    if (confirmed) {
      setStatus("won");
      refetchChallenge();
    }
  }, [confirmed, refetchChallenge]);

  const cores = useMemo(
    () =>
      typeof navigator !== "undefined"
        ? Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 16))
        : 4,
    []
  );

  const stop = useCallback(() => {
    workersRef.current.forEach((w) => {
      w.postMessage({ type: "stop" });
      w.terminate();
    });
    workersRef.current = [];
    setHashrate(0);
    rateWindowRef.current = null;
    if (status === "mining") setStatus("idle");
  }, [status]);

  const submit = useCallback(
    async (nonce: bigint) => {
      try {
        setStatus("submitting");
        const hash = await writeContractAsync({
          address: PICK_ADDRESS,
          abi: pickAbi,
          functionName: "mine",
          args: [nonce],
        });
        setTxHash(hash);
        setStatus("confirming");
      } catch (e) {
        const m = e instanceof Error ? e.message.split("\n")[0] : String(e);
        setError(m);
        setStatus("error");
      }
    },
    [writeContractAsync]
  );

  const start = useCallback(() => {
    if (!isConnected || !challenge || !difficulty) return;
    setError(null);
    setStatus("mining");
    totalHashesRef.current = 0n;
    rateWindowRef.current = { hashes: 0n, t0: performance.now() };

    const challengeBytes = hexToBytes(challenge as Hex);
    const targetBytes = bigIntToBytes32BE(difficulty as bigint);

    const workers: Worker[] = [];
    for (let i = 0; i < cores; i++) {
      const worker = new Worker("/miner-worker.js", { type: "module" });

      worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
        const msg = e.data;
        if (msg.type === "progress") {
          totalHashesRef.current += msg.hashes;
          const win = rateWindowRef.current;
          if (win) {
            win.hashes += msg.hashes;
            const elapsed = performance.now() - win.t0;
            if (elapsed > 250) {
              const rate = Number((win.hashes * 1000n) / BigInt(Math.max(1, Math.round(elapsed))));
              setHashrate(rate);
              rateWindowRef.current = { hashes: 0n, t0: performance.now() };
            }
          }
        } else if (msg.type === "solution") {
          // First solution wins — stop all workers, submit.
          workers.forEach((w) => {
            w.postMessage({ type: "stop" });
            w.terminate();
          });
          workersRef.current = [];
          submit(msg.nonce);
        }
      };

      worker.postMessage({
        type: "start",
        workerId: i,
        challenge: challengeBytes,
        target: targetBytes,
        startNonce: BigInt(i) * WORKER_STRIDE,
        batchSize: BATCH_SIZE,
      });
      workers.push(worker);
    }
    workersRef.current = workers;
  }, [isConnected, challenge, difficulty, cores, submit]);

  // Always terminate workers on unmount.
  useEffect(() => {
    return () => {
      workersRef.current.forEach((w) => w.terminate());
      workersRef.current = [];
    };
  }, []);

  return {
    status,
    hashrate,
    cores,
    challenge: challenge as Hex | undefined,
    difficulty: difficulty as bigint | undefined,
    error,
    txHash,
    isConfirming,
    start,
    stop,
  };
}

function bigIntToBytes32BE(n: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = n;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
