## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### HKPayFi Deploy Script

The project includes a protocol deployment script at `script/DeployHKPayFi.s.sol`.

Required environment variables:

```shell
PRIVATE_KEY=<deployer private key>
```

Optional environment variables:

```shell
PROTOCOL_ADMIN=<admin address, defaults to deployer>
TREASURY=<treasury address, defaults to PROTOCOL_ADMIN>
GUARDIAN=<guardian address, defaults to PROTOCOL_ADMIN>
EVALUATOR=<evaluator address, defaults to PROTOCOL_ADMIN>
USDC_ADDRESS=<existing USDC address; if omitted, the script deploys MockUSDC>
REVOKE_DEPLOYER_ADMIN=<true|false, defaults to true when admin != deployer>
MAX_ADVANCE_RATE=<uint256>
MIN_INTEREST_RATE=<uint256>
MAX_CREDIT_DURATION=<uint256 seconds>
PROTOCOL_FEE_RATE=<uint256>
DEFAULT_GRACE_PERIOD=<uint256 seconds>
SELLER_STAKE_RATE=<uint256>
MIN_TOKEN_HOLDING_FOR_PERKS=<uint256>
TOKEN_HOLDER_APR_DISCOUNT_BPS=<uint256>
TOKEN_HOLDER_GRACE_BONUS=<uint256 seconds>
GOOD_CREDIT_SCORE_THRESHOLD=<uint256>
GOOD_CREDIT_EXTRA_GRACE=<uint256 seconds>
```

Dry-run locally:

```shell
$ forge script script/DeployHKPayFi.s.sol:DeployHKPayFi
```

Broadcast to Sepolia and verify:

```shell
$ forge script script/DeployHKPayFi.s.sol:DeployHKPayFi \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

Deployment artifacts are written to `deployments/<network>.json`.

### HKPayFi Seed Script

The project also includes a seed-data script at `script/SeedHKPayFi.s.sol`.

It creates a small but useful demo dataset:

- 1 LP with an initial pool deposit
- 1 approved borrower
- 1 active receivable / credit line with a drawdown
- 1 approved receivable / credit line that has not been drawn yet
- 1 optional receivable / credit line that is drawn and repaid immediately

Required environment variables:

```shell
ADMIN_PRIVATE_KEY=<protocol admin private key>
SEED_PROTOCOL_CONFIG=<deployed ProtocolConfig address>
SEED_RECEIVABLE_NFT=<deployed ReceivableNFT address>
SEED_EVALUATION_AGENT=<deployed EvaluationAgent address>
SEED_LIQUIDITY_POOL=<deployed LiquidityPool address>
SEED_CREDIT_FACILITY=<deployed CreditFacility address>
SEED_HKP_TOKEN=<deployed HKPayToken address>
SEED_USDC=<deployed or existing USDC address>
```

Useful optional environment variables:

```shell
SEED_EVALUATOR_PRIVATE_KEY=<evaluator private key>
SEED_LP_PRIVATE_KEY=<lp private key>
SEED_BORROWER_PRIVATE_KEY=<borrower private key>
SEED_PAYER=<invoice payer address>
SEED_MINT_TEST_USDC=<true|false>
SEED_MINT_TEST_HKP=<true|false>
SEED_REPAID_LINE=<true|false>
```

Dry-run:

```shell
$ forge script script/SeedHKPayFi.s.sol:SeedHKPayFi
```

Broadcast to Sepolia:

```shell
$ forge script script/SeedHKPayFi.s.sol:SeedHKPayFi \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast
```

Seed artifacts are written to `deployments/<network>-seed.json`.

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
