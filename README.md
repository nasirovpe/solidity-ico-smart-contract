# Cryptos ICO Smart Contract

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![Hardhat](https://img.shields.io/badge/Hardhat-2.x-yellow)
![Tests](https://img.shields.io/badge/Tests-35%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

A professional Solidity and Hardhat project featuring a manual ERC20 token with ICO crowdsale logic, transfer lock protection, emergency admin controls, and automated tests.

## Project overview

**CryptosICO** (`CRPT`) combines token ledger logic and a time-bounded crowdsale in a single smart contract, without OpenZeppelin dependencies.

The founder receives an initial allocation, while sale tokens are held in the contract reserve. Investors can purchase tokens during the active ICO window using `invest()` or by sending ETH directly to the contract. Unsold sale tokens remain on the contract until the admin burns them after the sale window closes.

Transfers are disabled until `tokenTradeStartTime`, ensuring investors cannot move tokens before the public trading phase begins.

## Features

- Manual ERC20 implementation:
  - `name`
  - `symbol`
  - `decimals`
  - `totalSupply`
  - `balanceOf`
  - `transfer`
  - `approve`
  - `allowance`
  - `transferFrom`
  - `Transfer` event
  - `Approval` event
- ICO crowdsale logic:
  - Configurable token price
  - Hard cap protection
  - Sale start and end time
  - Minimum and maximum investment limits
  - Per-wallet investment tracking
  - ETH forwarding to a deposit wallet
  - Reentrancy guard on `invest()`
- `invest()` function for token purchases
- `receive()` function for direct ETH contributions
- Admin `halt()` and `resume()` emergency controls
- `changeDepositAddress()` for operational wallet updates
- `getCurrentState()` for sale phase visibility
- `burnUnsoldTokens()` after sale end
- Transfer lock until public trading starts
- Custom errors for gas-efficient reverts
- Zero-address validation
- Constructor checks for sale economics consistency
- No OpenZeppelin dependencies

## Tech stack

- [Solidity](https://soliditylang.org/) ^0.8.24
- [Hardhat](https://hardhat.org/)
- [Ethers.js](https://docs.ethers.org/) v6
- [Mocha](https://mochajs.org/)
- [Chai](https://www.chaijs.com/)
- `@nomicfoundation/hardhat-toolbox`

## Smart contract architecture

```text
CryptosICO.sol
├── ERC20 ledger
│   ├── balances
│   ├── allowances
│   ├── transfer
│   ├── approve
│   └── transferFrom
│
├── ICO state
│   ├── tokenPrice
│   ├── hardCap
│   ├── raisedAmount
│   ├── tokensSold
│   ├── investedAmount
│   ├── saleStartTime
│   ├── saleEndTime
│   ├── tokenTradeStartTime
│   └── halted
│
└── Admin controls
    ├── halt
    ├── resume
    ├── changeDepositAddress
    └── burnUnsoldTokens
```

### Investment flow

During the sale window, users can purchase tokens by calling `invest()` or by sending ETH directly to the contract.

The contract calculates token allocation as:

```text
tokens = (msg.value * 10 ** decimals) / tokenPrice;
```

After a successful investment:

1. ETH is received by the ICO contract.
2. The investment amount is validated against minimum and maximum limits.
3. The hard cap is checked.
4. Token allocation is calculated.
5. Tokens are moved from the contract sale reserve to the investor balance.
6. ETH is forwarded to the configured `depositWallet`.
7. An `Invested` event is emitted.

### Trading lock

Public token transfers are disabled until `tokenTradeStartTime`.

- Investors can receive tokens during the ICO.
- Investors cannot transfer tokens during the locked period.
- `transfer()` and `transferFrom()` become available only after public trading starts.

## Setup

Clone the repository:

```bash
git clone https://github.com/nasirovpe/solidity-ico-smart-contract.git
cd solidity-ico-smart-contract
```

Install dependencies:

```bash
npm install
```

## Test

```bash
npm test
```

## Test coverage

The Hardhat test suite covers:

- Contract deployment and constructor validation
- Token metadata and initial allocation
- Successful ICO investments and `receive()` purchases
- Minimum, maximum, and per-wallet investment limits
- Hard cap and token reserve exhaustion
- Reentrancy guard on `invest()`
- Halt, resume, and admin-only controls
- Deposit wallet updates
- Sale state visibility
- Transfer lock and post-unlock ERC20 flows
- Unsold token burning (including reserve-only burn)
- Custom error reverts

## Deployment

Run the local deployment script:

```bash
npx hardhat run scripts/deploy.js
```

Deploy to a configured network:

```bash
npx hardhat run scripts/deploy.js --network <networkName>
```

To deploy on a real network, add the required network configuration to `hardhat.config.js` and fund the deployer wallet.

## Example commands

```bash
npm install
npm test
npx hardhat compile
npx hardhat run scripts/deploy.js
```

## Project structure

```text
contracts/
├── CryptosICO.sol
└── mocks/
    └── ReentrantDepositWallet.sol

test/
└── CryptosICO.test.js

scripts/
└── deploy.js

hardhat.config.js
package.json
README.md
.gitignore
```

## Known limitations

- This project is for **demo and educational** use and has **not been professionally audited**.
- `hardCap` and the token sale reserve must be configured consistently at deploy time (the constructor enforces a maximum raise implied by `tokensForSale` and `tokenPrice`).
- ETH is forwarded to a **trusted deposit wallet**; use an EOA or a vetted receiver in production.
- **Admin controls are centralized** (`halt`, `resume`, `changeDepositAddress`, `burnUnsoldTokens`); production deployments should use a multisig and/or timelock.
- **Rounding** can occur when converting ETH to token amounts; remainder wei is not refunded.
- This codebase is **not production-ready** without an independent audit and qualified legal review.

## Security notes

This codebase is for learning and demonstration purposes. Before any production or mainnet deployment:

- Commission a professional smart contract audit
- Validate token economics carefully
- Review token price, hard cap, sale duration, and investment limits
- Use a multisig or timelock for admin actions
- Test deposit wallet forwarding on the target network
- Review failure paths for ETH transfers
- Consider legal and regulatory requirements for token sales
- Verify the contract source code after deployment
- Avoid using a single externally owned account for critical admin control

Custom errors are used for gas-efficient reverts, admin-only functions use an `onlyAdmin` modifier, and `invest()` uses a manual reentrancy lock before forwarding ETH.

## Portfolio purpose

This project demonstrates smart contract development skills including:

- Manual ERC20 implementation
- ICO crowdsale mechanics
- Time-based sale restrictions
- Transfer lock logic
- ETH payment handling and reentrancy awareness
- Admin access control
- Emergency pause controls
- Custom errors
- Token burn mechanics
- Automated smart contract testing with Hardhat

## Educational disclaimer

This project is provided for educational purposes only.

It is not financial, legal, or investment advice. Deploying token sales may be regulated in your jurisdiction. The authors assume no liability for funds lost due to bugs, misconfiguration, or misuse.

Always verify contracts on-chain, perform independent security reviews, and seek qualified legal counsel before launching a real ICO.
