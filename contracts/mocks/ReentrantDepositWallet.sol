// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../CryptosICO.sol";

/**
 * @notice Test helper: reenters invest() when receiving ETH from the ICO.
 */
contract ReentrantDepositWallet {
    CryptosICO public ico;

    constructor(CryptosICO _ico) {
        ico = _ico;
    }

    receive() external payable {
        ico.invest{value: msg.value}();
    }
}
