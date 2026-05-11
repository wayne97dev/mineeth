"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import {
  encodeAbiParameters,
  encodePacked,
  parseEther,
  parseUnits,
  type Hex,
  type Address,
} from "viem";
import { pickAbi } from "@/lib/pickAbi";
import { PICK_ADDRESS } from "@/lib/contract";

const UNIVERSAL_ROUTER: Record<number, Address> = {
  1: "0x4c82d1Fbfe28C977Cbb58D8C7Ff8Fcf9F70A2cca",
  11155111: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
};

const PERMIT2: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const SWAP_EXACT_IN_SINGLE = 0x06;
const SETTLE_ALL           = 0x0c;
const TAKE_ALL             = 0x0f;
const V4_SWAP              = 0x10;

const universalRouterAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const permit2Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
] as const;

type Mode = "buy" | "sell";

export function Trade() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = UNIVERSAL_ROUTER[chainId];

  const [mode, setMode] = useState<Mode>("buy");
  const [amountStr, setAmountStr] = useState("");

  const { data: genesis } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "genesisState",
    query: { refetchInterval: 12_000 },
  });
  const complete = (genesis as readonly [bigint, bigint, bigint, boolean] | undefined)?.[3] ?? false;

  // Allowance reads only matter for sell mode.
  const allow = useReadContracts({
    contracts: address && router
      ? [
          { address: PICK_ADDRESS, abi: pickAbi, functionName: "allowance", args: [address, PERMIT2] },
          { address: PERMIT2, abi: permit2Abi, functionName: "allowance", args: [address, PICK_ADDRESS, router] },
        ]
      : [],
    query: { enabled: !!address && !!router && mode === "sell", refetchInterval: 12_000 },
  });

  const pickToPermit2 = allow.data?.[0]?.result as bigint | undefined;
  const permit2ToRouter = (allow.data?.[1]?.result as readonly [bigint, number, number] | undefined)?.[0];

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  function poolKeyStruct() {
    return {
      currency0: "0x0000000000000000000000000000000000000000" as Address,
      currency1: PICK_ADDRESS,
      fee: 0,
      tickSpacing: 200,
      hooks: PICK_ADDRESS,
    };
  }

  function buildV4SwapInput(zeroForOne: boolean, amountIn: bigint, currencyIn: Address, currencyOut: Address): Hex {
    const swapParams = encodeAbiParameters(
      [{
        type: "tuple",
        components: [
          { type: "tuple", name: "poolKey", components: [
            { type: "address", name: "currency0" },
            { type: "address", name: "currency1" },
            { type: "uint24",  name: "fee" },
            { type: "int24",   name: "tickSpacing" },
            { type: "address", name: "hooks" },
          ]},
          { type: "bool",    name: "zeroForOne" },
          { type: "uint128", name: "amountIn" },
          { type: "uint128", name: "amountOutMinimum" },
          { type: "bytes",   name: "hookData" },
        ],
      }],
      [{ poolKey: poolKeyStruct(), zeroForOne, amountIn, amountOutMinimum: 0n, hookData: "0x" as Hex }]
    );

    const settleAll = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [currencyIn, amountIn]
    );

    const takeAll = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [currencyOut, 0n]
    );

    const actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL]
    );

    return encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      [actions, [swapParams, settleAll, takeAll]]
    );
  }

  function buy() {
    if (!router) return;
    const amount = parseEther(amountStr || "0");
    if (amount === 0n) return;
    const input = buildV4SwapInput(true, amount, "0x0000000000000000000000000000000000000000", PICK_ADDRESS);
    writeContract({
      address: router,
      abi: universalRouterAbi,
      functionName: "execute",
      args: [encodePacked(["uint8"], [V4_SWAP]), [input], BigInt(Math.floor(Date.now() / 1000) + 60)],
      value: amount,
    });
  }

  function sell() {
    if (!router) return;
    const amount = parseUnits(amountStr || "0", 18);
    if (amount === 0n) return;
    const input = buildV4SwapInput(false, amount, PICK_ADDRESS, "0x0000000000000000000000000000000000000000");
    writeContract({
      address: router,
      abi: universalRouterAbi,
      functionName: "execute",
      args: [encodePacked(["uint8"], [V4_SWAP]), [input], BigInt(Math.floor(Date.now() / 1000) + 60)],
    });
  }

  function approvePickToPermit2() {
    writeContract({
      address: PICK_ADDRESS,
      abi: pickAbi,
      functionName: "approve",
      args: [PERMIT2, 2n ** 256n - 1n],
    });
  }

  function approvePermit2ToRouter() {
    if (!router) return;
    writeContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: "approve",
      args: [PICK_ADDRESS, router, 2n ** 160n - 1n, 2 ** 48 - 1],
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="panel-label">trade</div>
        <div className="flex gap-1 font-mono text-xs">
          <button
            onClick={() => setMode("buy")}
            className={`btn ${mode === "buy" ? "btn-primary" : ""}`}
            style={{ padding: "4px 12px" }}
          >
            buy
          </button>
          <button
            onClick={() => setMode("sell")}
            className={`btn ${mode === "sell" ? "btn-primary" : ""}`}
            style={{ padding: "4px 12px" }}
          >
            sell
          </button>
        </div>
      </div>

      <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
        Direct interaction with the locked V4 pool. 1% of every swap accrues
        as ETH on the contract and is claimable by the controller. Slippage
        protection is off in this build, so keep amounts small until a quoter
        is wired in.
      </p>

      {!complete && (
        <div className="font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
          The pool opens after seeding. Trading is disabled until then.
        </div>
      )}

      {complete && !router && (
        <div className="font-mono text-sm" style={{ color: "var(--fg-muted)" }}>
          No Universal Router known for chain {chainId}. Switch network.
        </div>
      )}

      {complete && router && (
        <>
          <div>
            <label className="panel-label">
              {mode === "buy" ? "eth to spend" : "pick to sell"}
            </label>
            <input
              className="input mt-1"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder={mode === "buy" ? "0.001" : "100"}
              inputMode="decimal"
            />
          </div>

          {mode === "buy" && (
            <button
              onClick={buy}
              disabled={!isConnected || isPending || isConfirming}
              className="btn btn-primary w-full"
            >
              {!isConnected
                ? "connect wallet to buy"
                : isPending
                  ? "confirm in wallet…"
                  : isConfirming
                    ? "swapping…"
                    : isSuccess
                      ? "swapped ✓"
                      : "buy PICK"}
            </button>
          )}

          {mode === "sell" && (
            <SellButtons
              isConnected={isConnected}
              isPending={isPending}
              isConfirming={isConfirming}
              isSuccess={isSuccess}
              pickToPermit2={pickToPermit2}
              permit2ToRouter={permit2ToRouter}
              amount={(() => { try { return parseUnits(amountStr || "0", 18); } catch { return 0n; } })()}
              onApprovePick={approvePickToPermit2}
              onApprovePermit2={approvePermit2ToRouter}
              onSell={sell}
            />
          )}

          {error && (
            <div className="text-xs font-mono" style={{ color: "var(--danger)" }}>
              {error.message.split("\n")[0]}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SellButtons(props: {
  isConnected: boolean;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  pickToPermit2: bigint | undefined;
  permit2ToRouter: bigint | undefined;
  amount: bigint;
  onApprovePick: () => void;
  onApprovePermit2: () => void;
  onSell: () => void;
}) {
  const {
    isConnected, isPending, isConfirming, isSuccess,
    pickToPermit2, permit2ToRouter, amount,
    onApprovePick, onApprovePermit2, onSell,
  } = props;

  if (!isConnected) {
    return <button disabled className="btn btn-primary w-full">connect wallet to sell</button>;
  }

  const needsPickApprove = (pickToPermit2 ?? 0n) < amount;
  const needsPermit2Approve = (permit2ToRouter ?? 0n) < amount;

  const busyLabel = isPending ? "confirm in wallet…" : isConfirming ? "confirming…" : null;

  if (needsPickApprove) {
    return (
      <button
        onClick={onApprovePick}
        disabled={isPending || isConfirming}
        className="btn btn-primary w-full"
      >
        {busyLabel ?? "step 1 of 3: approve PICK to Permit2"}
      </button>
    );
  }

  if (needsPermit2Approve) {
    return (
      <button
        onClick={onApprovePermit2}
        disabled={isPending || isConfirming}
        className="btn btn-primary w-full"
      >
        {busyLabel ?? "step 2 of 3: approve Universal Router via Permit2"}
      </button>
    );
  }

  return (
    <button
      onClick={onSell}
      disabled={isPending || isConfirming || amount === 0n}
      className="btn btn-primary w-full"
    >
      {busyLabel ?? (isSuccess ? "sold ✓" : "sell PICK")}
    </button>
  );
}
