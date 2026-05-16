# HKPayFi Technical Report

## 1. Project Overview

HKPayFi is an on-chain receivables financing protocol built for cross-border payment and trade finance scenarios. The protocol allows sellers to tokenize trade receivables as NFTs, apply for credit lines backed by those receivables, draw liquidity from a shared USDC pool, and repay principal plus interest through smart contracts.

The system combines Solidity smart contracts, Foundry deployment and testing workflows, and a Next.js dashboard for role-based protocol interaction. It is currently configured for Sepolia testnet usage and includes deployed contract address configuration for the frontend.

The project is organized around three main participant roles:

- Sellers tokenize invoices, request financing, draw down approved credit, and repay loans.
- Liquidity providers deposit USDC into an ERC-4626 vault and earn protocol yield from repayments.
- Protocol administrators approve borrowers, manage underwriting parameters, monitor blacklist state, and update global protocol settings.

## 2. Business and Technical Motivation

Traditional receivables financing often depends on manual underwriting, centralized record keeping, and fragmented liquidity access. HKPayFi explores a DeFi-native model where receivables, credit decisions, liquidity, repayment state, and default handling are represented directly on-chain.

The technical goals of the project are:

- Represent receivables as transferable and stateful ERC-721 assets.
- Provide programmable credit facilities backed by evaluated receivables.
- Pool liquidity through a standard ERC-4626 vault model.
- Enforce borrower risk controls through credit scores, advance rates, credit limits, and blacklisting.
- Add seller skin-in-the-game through a stake mechanism that is returned on repayment and slashed on default.
- Support native HKP token perks such as APR discounts and grace-period extensions.
- Automate overdue credit-line default detection through a Chainlink Automation-compatible interface.
- Expose core protocol workflows through a wallet-connected web dashboard.

## 3. System Architecture

HKPayFi is composed of six core smart contracts plus a frontend application.

### 3.1 Smart Contract Layer

| Contract | Responsibility |
| --- | --- |
| `ProtocolConfig` | Stores global risk parameters, treasury address, emergency pause controls, and default grace-period settings. |
| `ReceivableNFT` | ERC-721 contract representing invoice-backed receivables and their lifecycle states. |
| `EvaluationAgent` | Maintains borrower profiles, credit scores, borrower approvals, receivable approvals, repayment history, and blacklist state. |
| `LiquidityPool` | ERC-4626 USDC vault that accepts LP deposits, funds borrower drawdowns, receives repayments, tracks interest, and records losses. |
| `CreditFacility` | Core lending engine that creates credit lines, handles drawdowns, accrues interest, processes repayments, manages seller stake, triggers defaults, and exposes Chainlink Automation hooks. |
| `HKPayToken` | Native utility token used for protocol perks, including APR discounts and additional grace-period logic. |
| `MockUSDC` | Test USDC implementation with 6 decimals for local and testnet demonstrations. |

### 3.2 Frontend Layer

The frontend is a Next.js application located in `frontend/`. It connects to MetaMask through `ethers.js` and provides role-specific dashboards:

- `/login`: wallet connection, Sepolia network check, and role selection.
- `/dashboard/admin`: borrower underwriting, borrower approval, blacklist visibility, and protocol controls.
- `/dashboard/seller`: receivable minting, credit applications, drawdown, repayment, credit score, lifecycle tracking, HKP perks, and default status.
- `/dashboard/lp`: liquidity deposits, withdrawals, pool overview, and risk metrics.

Contract addresses used by the frontend are defined in:

```text
frontend/constants/contracts.ts
```

## 4. Functional Scope

### 4.1 Receivable Tokenization

Sellers can mint receivable NFTs that represent trade invoices. Each receivable records business-critical metadata such as borrower, payer, face amount, due date, metadata URI, and lifecycle state.

Receivable lifecycle states include:

- Created
- Approved
- Financed
- Paid
- Defaulted

### 4.2 Borrower Evaluation and Underwriting

The `EvaluationAgent` contract manages borrower approval and credit parameters. Approved borrower profiles include:

- Credit score
- Maximum credit limit
- Interest rate
- Advance rate
- Approval status
- Blacklist status
- Repayment statistics

This layer controls whether a borrower is eligible to use approved receivables as collateral for credit.

### 4.3 Credit Facility

The `CreditFacility` contract creates and manages credit lines backed by approved receivable NFTs. A borrower can apply for credit, draw down liquidity, and repay the credit line over time.

The credit lifecycle includes:

- Credit application
- Credit approval
- Drawdown
- Active repayment period
- Full repayment
- Default handling

Interest is calculated using APR basis points over elapsed time. After the due date, penalty interest applies for the overdue period.

### 4.4 Seller Stake and Default Protection

Before the first drawdown, the seller must provide a USDC stake. This creates economic alignment between the seller and liquidity providers.

The stake logic is:

- Returned to the seller after full repayment.
- Slashed and injected into the liquidity pool if the credit line defaults.
- Used as first-loss protection before residual losses are absorbed by the LP pool.

### 4.5 Liquidity Pool

The liquidity pool is implemented as an ERC-4626 vault. Liquidity providers deposit USDC and receive vault shares. The pool is responsible for:

- Accepting LP deposits.
- Funding borrower drawdowns.
- Receiving principal and interest repayments.
- Tracking total borrowed principal.
- Tracking total interest earned.
- Recording default losses.
- Enforcing liquidity checks during withdrawals and redemptions.

### 4.6 HKP Token Perks

HKPayFi includes a native HKP utility token. Borrowers who hold a configured minimum HKP balance may receive credit perks at drawdown time.

Supported perk parameters include:

- Minimum HKP holding threshold.
- APR discount in basis points.
- Additional grace period for token holders.
- Credit-score threshold for enhanced grace.
- Extra grace period for qualified good-credit holders.

### 4.7 Default Detection and Chainlink Automation

`CreditFacility` implements a Chainlink Automation-compatible interface:

- `checkUpkeep` scans for active credit lines whose due date plus grace period has elapsed.
- `performUpkeep` processes eligible credit lines in bounded batches.

This design allows default detection to be automated while keeping gas usage controlled through a maximum batch size.

## 5. Technology Stack

### 5.1 Smart Contracts

- Solidity `0.8.28`
- Foundry
- Forge tests
- OpenZeppelin Contracts
- ERC-20
- ERC-721
- ERC-4626
- AccessControl
- Pausable
- ReentrancyGuard
- Chainlink Automation-compatible interface

### 5.2 Frontend

- Next.js `16.2.4`
- React `19.2.4`
- TypeScript
- Tailwind CSS
- ethers.js `6.x`
- MetaMask wallet integration
- App Router

### 5.3 Tooling and Artifacts

- `foundry.toml` for Solidity compiler and Foundry settings.
- `deployments/` for deployment and seed output artifacts.
- `broadcast/` for Foundry broadcast transaction traces.
- `slither-results.json` for static analysis output.
- `frontend/abis/` for frontend contract ABI files.

## 6. Repository Structure

```text
.
|-- src/                         Smart contracts
|-- test/                        Foundry test suites
|-- script/                      Deployment and seed scripts
|-- deployments/                 Network deployment artifacts
|-- broadcast/                   Foundry broadcast logs
|-- frontend/                    Next.js web application
|   |-- app/                     App Router pages and layouts
|   |-- components/              UI panels, forms, cards, and tables
|   |-- hooks/                   ethers.js contract interaction hooks
|   |-- abis/                    Contract ABIs used by the frontend
|   |-- constants/contracts.ts   Frontend contract address configuration
|-- foundry.toml                 Foundry configuration
|-- foundry.lock                 Foundry dependency lock file
|-- slither-results.json         Static analysis results
```

## 7. Smart Contract Workflow

The typical protocol workflow is:

1. The protocol is deployed and configured with admin, treasury, guardian, evaluator, USDC, and HKP token settings.
2. Liquidity providers deposit USDC into the `LiquidityPool`.
3. A seller mints a receivable NFT through `ReceivableNFT`.
4. An evaluator approves the borrower and receivable through `EvaluationAgent`.
5. The seller applies for credit through `CreditFacility`.
6. The seller approves USDC spending for the required stake and drawdown flow.
7. The seller draws down USDC from the liquidity pool.
8. The seller repays principal and accrued interest.
9. On full repayment, the receivable is marked paid and the seller stake is returned.
10. If the credit line becomes defaultable, the protocol can trigger default manually or through Chainlink Automation.

## 8. Prerequisites

Install the following tools before running the project:

- Git
- Foundry
- Node.js 20 or later
- npm
- MetaMask browser wallet
- Sepolia ETH for testnet transactions
- A Sepolia RPC endpoint if deploying or interacting outside the preconfigured frontend

Foundry installation reference:

```shell
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## 9. Local Setup

Clone the repository and switch to the target branch:

```shell
git clone https://github.com/liaojianhan123-cyber/HKpayfi.git
cd HKpayfi
git checkout feat/frontent-Scott
```

Install Foundry dependencies if they are not already available:

```shell
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

Install frontend dependencies:

```shell
cd frontend
npm install
```

## 10. Build and Test

From the repository root, build the smart contracts:

```shell
forge build
```

Run the Foundry test suite:

```shell
forge test
```

Run tests with detailed traces:

```shell
forge test -vvv
```

Format Solidity code:

```shell
forge fmt
```

Run the frontend lint command:

```shell
cd frontend
npm run lint
```

Build the frontend:

```shell
cd frontend
npm run build
```

## 11. Running the Frontend

Start the development server:

```shell
cd frontend
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

Main application routes:

```text
/login
/dashboard/admin
/dashboard/lp
/dashboard/seller
```

The login page requires:

- MetaMask connected.
- Wallet network set to Sepolia.
- A selected role: LP, Seller, or Admin.

If the development script has environment-variable compatibility issues on Windows, run this PowerShell alternative from `frontend/`:

```powershell
$env:NEXT_DISABLE_TURBOPACK="1"
npx next dev
```

## 12. Deployment

The main deployment script is:

```text
script/DeployHKPayFi.s.sol
```

Required environment variable:

```shell
PRIVATE_KEY=<deployer_private_key>
```

Common optional environment variables:

```shell
PROTOCOL_ADMIN=<admin_address>
TREASURY=<treasury_address>
GUARDIAN=<guardian_address>
EVALUATOR=<evaluator_address>
USDC_ADDRESS=<existing_usdc_address>
REVOKE_DEPLOYER_ADMIN=<true_or_false>
MAX_ADVANCE_RATE=<basis_points>
MIN_INTEREST_RATE=<basis_points>
MAX_CREDIT_DURATION=<seconds>
PROTOCOL_FEE_RATE=<basis_points>
DEFAULT_GRACE_PERIOD=<seconds>
SELLER_STAKE_RATE=<basis_points>
MIN_TOKEN_HOLDING_FOR_PERKS=<token_amount>
TOKEN_HOLDER_APR_DISCOUNT_BPS=<basis_points>
TOKEN_HOLDER_GRACE_BONUS=<seconds>
GOOD_CREDIT_SCORE_THRESHOLD=<score>
GOOD_CREDIT_EXTRA_GRACE=<seconds>
```

Run a local dry run:

```shell
forge script script/DeployHKPayFi.s.sol:DeployHKPayFi
```

Deploy to Sepolia:

```shell
forge script script/DeployHKPayFi.s.sol:DeployHKPayFi \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Deployment output is written to:

```text
deployments/<network>.json
```

## 13. Seed Data

The seed script is:

```text
script/SeedHKPayFi.s.sol
```

It creates a practical demo dataset with:

- One liquidity provider with an initial pool deposit.
- One approved borrower.
- One active receivable and credit line with a drawdown.
- One approved receivable and credit line that has not been drawn.
- One optional receivable and credit line that is drawn and repaid immediately.

Required seed environment variables:

```shell
ADMIN_PRIVATE_KEY=<protocol_admin_private_key>
SEED_PROTOCOL_CONFIG=<deployed_protocol_config_address>
SEED_RECEIVABLE_NFT=<deployed_receivable_nft_address>
SEED_EVALUATION_AGENT=<deployed_evaluation_agent_address>
SEED_LIQUIDITY_POOL=<deployed_liquidity_pool_address>
SEED_CREDIT_FACILITY=<deployed_credit_facility_address>
SEED_HKP_TOKEN=<deployed_hkp_token_address>
SEED_USDC=<deployed_or_existing_usdc_address>
```

Broadcast seed data to Sepolia:

```shell
forge script script/SeedHKPayFi.s.sol:SeedHKPayFi \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

Seed output is written to:

```text
deployments/<network>-seed.json
```

## 14. Security and Risk Controls

HKPayFi includes several protocol-level risk controls:

- Access-controlled administrative functions.
- Guardian-controlled emergency pause.
- Maximum advance-rate limit.
- Minimum interest-rate floor.
- Maximum credit-duration constraint.
- Seller stake requirement before drawdown.
- First-loss seller stake slashing on default.
- Borrower blacklist after default.
- Reentrancy protection on core fund-moving flows.
- ERC-4626 liquidity checks for withdrawal and redemption.
- Batch-limited Chainlink Automation default processing.

Important operational note: private keys, RPC URLs, and API keys must be provided through local environment variables and must never be committed to the repository.

## 15. Testing Coverage

The repository includes Foundry tests for the main protocol behaviors:

- Full HKPayFi integration flow.
- Seller stake and default protection.
- Native HKP token discount logic.
- Chainlink Automation-compatible default detection.

Test files are located in:

```text
test/
```

Run all tests from the repository root:

```shell
forge test
```

## 16. Current Network Configuration

The repository includes Sepolia deployment artifacts under `deployments/` and frontend contract address constants under `frontend/constants/contracts.ts`.

When redeploying contracts, update the frontend constants and ABI files so the web application points to the intended network deployment.

## 17. Summary

HKPayFi demonstrates a full-stack DeFi receivables financing protocol. It combines tokenized invoices, on-chain underwriting, pooled liquidity, automated credit-line lifecycle management, seller-side risk alignment, token-based borrower incentives, and a role-based web dashboard. The system is designed as a practical prototype for programmable trade finance on Ethereum-compatible networks.
