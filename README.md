# DMN

Mined ERC-20 with a self-hook — the token contract IS its own Uniswap V4
hook. One address, one bytecode: the token, the hook, and the PoW miner
are the same contract.

Logic forked 1:1 from `hash256.org` (MIT). Branding and frontend are new.

## Architecture

- **Token** — ERC-20 named `Daemon` / `DMN`, 21M cap, 18 decimals.
- **Genesis sale** — 1.05M DMN (5%) sold at `0.01 ETH` per `1,000 DMN`,
  max 5 units per tx. ETH raised goes into the Uniswap V4 pool.
- **Pool seeding** — once genesis is sold out (or 30 min after deploy via
  `partialSeed`), 1.05M DMN + raised ETH form the V4 LP; the controller
  receives the LP position.
- **Mining** — 18.9M DMN (90%) released via PoW.
  - Challenge: `keccak256(keccak256(chainId, contract, miner, epoch), nonce) < currentDifficulty`
  - Epoch: every 100 blocks (~20 min)
  - Reward: `100 DMN >> era`, era = `totalMints / 100_000`
  - Retarget: every 2016 mints, clamped ±4×
  - Cap: 10 mints/block
  - Replay protection: per-(miner, nonce, epoch)
- **Self-hook** — 1% of every swap is taken as ETH and accumulated on the
  contract. `controller` (the address that deployed the contract) calls
  `claimFees()` to withdraw.

## Setup

```bash
cp .env.example .env
# fill MAINNET_RPC, ETHERSCAN_KEY
forge build
forge test
```

## Deploying

> **Read this before you spend gas.** Deployment is irreversible. The address
> that signs the deploy tx becomes `controller` for life (via `tx.origin`)
> and receives all LP swap fees. Use a fresh, dedicated EOA — **not** a Safe,
> factory, or smart-contract wallet.

### 1. Fund the deploy wallet

Send ≥ 0.1 ETH to the EOA that will sign the deploy. This covers:

- Deploy itself (≈ 0.025-0.05 ETH at 20-40 gwei)
- A buffer for failed sims or salt re-mining
- The first few `mintGenesis` calls (if you bootstrap genesis yourself)

### 2. Dry-run against a mainnet fork

```bash
forge script script/Deploy.s.sol \
  --rpc-url $MAINNET_RPC \
  -vvv
```

The script:
1. Mines a CREATE2 salt that lands the address at `addr & 0x3FFF == 0x20CC`
   (≈ 16k iterations average, sub-second).
2. Logs the predicted address.
3. Does NOT broadcast — review the logs.

### 3. Real deployment (mainnet)

Pick **one** of these signing methods:

**Ledger:**
```bash
forge script script/Deploy.s.sol \
  --rpc-url $MAINNET_RPC \
  --ledger \
  --sender 0xYourLedgerAddress \
  --broadcast --verify
```

**Foundry encrypted keystore** (`cast wallet import pick-deploy --interactive`):
```bash
forge script script/Deploy.s.sol \
  --rpc-url $MAINNET_RPC \
  --account pick-deploy \
  --sender 0xYourEoaAddress \
  --broadcast --verify
```

**Private key** (least safe, only for testnets / throwaway wallets):
```bash
PRIVATE_KEY=0x... forge script script/Deploy.s.sol \
  --rpc-url $MAINNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

### 4. Post-deploy checks

After the tx confirms:

- Verify the deployed address matches the predicted one (`broadcast/`).
- Verify on Etherscan the source is shown (`--verify` flag did this).
- Read `controller()` — must be your deploy EOA.
- Read `genesisComplete()` — must be `false`.

### 5. Opening genesis

Genesis is permissionless — anyone can call `mintGenesis(units)` with
`units * 0.01 ETH`. Publicize the contract address; do not call it from
the controller wallet (unnecessary).

### 6. Seeding the pool

Two routes:

- **Full**: `seedPool()` — callable by anyone once `genesisMinted == GENESIS_CAP`.
- **Partial**: `partialSeed()` — callable **only by controller**, only after
  `deployedAt + 30 min`. Use this if genesis stalls below the cap.

Seeding initializes the V4 pool and mints LP to the controller. After this
call, `mine()` becomes callable.

## Testing

```bash
forge test -vv
```

12 unit tests cover the non-V4 surface (mine, genesis, replay, block cap,
supply exhaust). V4-integrated flows (seedPool, hook fee collection)
belong in fork tests — TODO.

## Storage layout

| Slot | Variable |
|------|----------|
| 0    | `_balances` (mapping) |
| 1    | `_allowances` (mapping) |
| 2    | `_totalSupply` |
| 3    | `_name` |
| 4    | `_symbol` |
| 5    | `_status` (ReentrancyGuard) |
| 6    | `genesisEthRaised` |
| 7    | `genesisMinted` |
| 8    | `genesisComplete` |
| 9    | `totalMints` |
| 10   | `totalMiningMinted` |
| 11   | `currentDifficulty` |
| 12   | `lastAdjustmentMint` |
| 13   | `lastAdjustmentBlock` |
| 14   | `mintsInBlock` (mapping) |
| 15   | `usedProofs` (mapping) |
| 16+  | `poolKey` (struct) |
