"use client";

import { useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import {
  encodeAbiParameters,
  encodePacked,
  parseEther,
  type Hex,
  type Address,
} from "viem";
import { pickAbi } from "@/lib/pickAbi";
import { PICK_ADDRESS } from "@/lib/contract";

// Universal Router addresses (V4 swap entry point). Pre-V4 routers do not
// support `V4_SWAP` and will revert.
const UNIVERSAL_ROUTER: Record<number, Address> = {
  1: "0x4c82d1Fbfe28C977Cbb58D8C7Ff8Fcf9F70A2cca",        // mainnet
  11155111: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b", // sepolia
};

// V4 action selectors
const SWAP_EXACT_IN_SINGLE = 0x06;
const SETTLE_ALL           = 0x0c;
const TAKE_ALL             = 0x0f;

// Universal Router command for a V4 swap
const V4_SWAP = 0x10;

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

export function Trade() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [ethIn, setEthIn] = useState("0.001");

  const { data: genesis } = useReadContract({
    address: PICK_ADDRESS,
    abi: pickAbi,
    functionName: "genesisState",
    query: { refetchInterval: 12_000 },
  });
  const complete = (genesis as readonly [bigint, bigint, bigint, boolean] | undefined)?.[3] ?? false;

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const router = UNIVERSAL_ROUTER[chainId];

  function buy() {
    if (!router) return;
    const amount = parseEther(ethIn || "0");
    if (amount === 0n) return;

    const poolKeyTuple = [
      "0x0000000000000000000000000000000000000000" as Address, // currency0 = native ETH
      PICK_ADDRESS,                                            // currency1 = PICK
      0,                                                       // fee
      200,                                                     // tickSpacing
      PICK_ADDRESS,                                            // hooks (the contract itself)
    ] as const;

    // SWAP_EXACT_IN_SINGLE params:
    //   (PoolKey, zeroForOne, amountIn, amountOutMinimum, hookData)
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
      [{
        poolKey: {
          currency0:   poolKeyTuple[0],
          currency1:   poolKeyTuple[1],
          fee:         poolKeyTuple[2],
          tickSpacing: poolKeyTuple[3],
          hooks:       poolKeyTuple[4],
        },
        zeroForOne: true,
        amountIn: amount,
        amountOutMinimum: 0n, // demo only; tighten with a quoter before mainnet
        hookData: "0x" as Hex,
      }]
    );

    // SETTLE_ALL(currency=ETH, maxAmount=amount) — pay the ETH side.
    const settleAll = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      ["0x0000000000000000000000000000000000000000", amount]
    );

    // TAKE_ALL(currency=PICK, minAmount=0) — receive the PICK side.
    const takeAll = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [PICK_ADDRESS, 0n]
    );

    const actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL]
    );

    // V4_SWAP input is (actions, params[])
    const v4SwapInput = encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      [actions, [swapParams, settleAll, takeAll]]
    );

    const commands = encodePacked(["uint8"], [V4_SWAP]);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);

    writeContract({
      address: router,
      abi: universalRouterAbi,
      functionName: "execute",
      args: [commands, [v4SwapInput], deadline],
      value: amount,
    });
  }

  return (
    <div className="panel p-6 space-y-4">
      <div>
        <div className="panel-label">trade</div>
        <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
          Buy PICK directly from the locked V4 pool. The 1% swap fee accrues
          to the contract and is claimable by the controller. Selling PICK
          back to ETH works the same way via any V4-aware router or aggregator.
        </p>
      </div>

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
            <label className="panel-label">eth to spend</label>
            <input
              className="input mt-1"
              value={ethIn}
              onChange={(e) => setEthIn(e.target.value)}
              placeholder="0.001"
              inputMode="decimal"
            />
            <div className="font-mono text-xs mt-1"
                 style={{ color: "var(--fg-dim)" }}>
              slippage protection off in this demo build; do not use with
              non-trivial amounts.
            </div>
          </div>

          <button
            onClick={buy}
            disabled={!isConnected || isPending || isMining}
            className="btn btn-primary w-full"
          >
            {!isConnected
              ? "connect wallet to trade"
              : isPending
                ? "confirm in wallet…"
                : isMining
                  ? "swapping…"
                  : isSuccess
                    ? "swapped ✓"
                    : "buy PICK"}
          </button>

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
