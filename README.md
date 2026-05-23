# Cryptos ICO Smart Contract

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![Hardhat](https://img.shields.io/badge/Hardhat-2.x-yellow)
![Tests](https://img.shields.io/badge/Tests-27%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

A professional Solidity and Hardhat project featuring a manual ERC20 token with ICO crowdsale logic, transfer lock protection, emergency admin controls, and 27 passing automated tests.

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
- `invest()` function for token purchases
- `receive()` function for direct ETH contributions
- Admin `halt()` and `resume()` emergency controls
- `changeDepositAddress()` for operational wallet updates
- `getCurrentState()` for sale phase visibility
- `burnUnsoldTokens()` after sale end
- Transfer lock until public trading starts
- Custom errors for gas-efficient reverts
- Zero-address validation
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

    Investment flow

During the sale window, users can purchase tokens by calling invest() or by sending ETH directly to the contract.

The contract calculates token allocation as:
tokens = (msg.value * 10 ** decimals) / tokenPrice;

After a successful investment:

ETH is received by the ICO contract.
The investment amount is validated against minimum and maximum limits.
The hard cap is checked.
Token allocation is calculated.
Tokens are moved from the contract sale reserve to the investor balance.
ETH is forwarded to the configured depositWallet.
An investment event is emitted.
Trading lock

Public token transfers are disabled until tokenTradeStartTime.

This means:

Investors can receive tokens during the ICO.
Investors cannot transfer tokens during the locked period.
transfer() and transferFrom() become available only after public trading starts.
Test

npm test

Test coverage

The project includes 27 passing Hardhat tests covering:

Contract deployment
Token metadata
Initial token allocation
Sale reserve allocation
Successful ICO investments
Direct ETH purchases via receive()
Minimum investment validation
Maximum investment validation
Per-wallet investment limits
Hard cap protection
ICO halted state
Admin halt and resume controls
Admin-only function restrictions
Deposit wallet updates
Sale state visibility
Transfer lock before public trading
Transfers after trading starts
ERC20 approve
ERC20 allowance
ERC20 transferFrom
Unsold token burning after the sale ends
totalSupply reduction after burn
Zero-address validation
Custom error reverts
Setup

Clone the repository:

git clone https://github.com/nasirovpe/solidity-ico-smart-contract.git
cd solidity-ico-smart-contract

Install dependencies:

Run tests:

npm test

Deployment

Run the local deployment script:

npx hardhat run scripts/deploy.js

Deploy to a configured network:

npx hardhat run scripts/deploy.js --network <networkName>

To deploy on a real network, add the required network configuration to hardhat.config.js and fund the deployer wallet.

Example commands

npm install
npm test
npx hardhat compile
npx hardhat run scripts/deploy.js

Project structure

contracts/
└── CryptosICO.sol

test/
└── CryptosICO.test.js

scripts/
└── deploy.js

hardhat.config.js
package.json
README.md
.gitignore

Security notes

This codebase is for learning and demonstration purposes. Before any production or mainnet deployment:

Commission a professional smart contract audit
Validate token economics carefully
Review token price, hard cap, sale duration, and investment limits
Use a multisig or timelock for admin actions
Test deposit wallet forwarding on the target network
Review failure paths for ETH transfers
Consider legal and regulatory requirements for token sales
Verify the contract source code after deployment
Avoid using a single externally owned account for critical admin control

Custom errors are used for gas-efficient reverts, and admin-only functions are protected with an onlyAdmin modifier.

Portfolio purpose

This project demonstrates smart contract development skills including:

Manual ERC20 implementation
ICO crowdsale mechanics
Time-based sale restrictions
Transfer lock logic
ETH payment handling
Admin access control
Emergency pause controls
Custom errors
Token burn mechanics
Automated smart contract testing with Hardhat
Educational disclaimer

This project is provided for educational purposes only.

It is not financial, legal, or investment advice. Deploying token sales may be regulated in your jurisdiction. The authors assume no liability for funds lost due to bugs, misconfiguration, or misuse.

Always verify contracts on-chain, perform independent security reviews, and seek qualified legal counsel before launching a real ICO.