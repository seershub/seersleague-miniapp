// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title SeersLeagueProxy
 * @notice Proxy contract for SeersLeagueV2 (UUPS Upgradeable)
 * @dev This proxy allows the implementation to be upgraded while preserving state
 */
contract SeersLeagueProxy is ERC1967Proxy {
    /**
     * @notice Initialize the proxy
     * @param implementation Address of the implementation contract
     * @param data Initialization data for the implementation
     */
    constructor(address implementation, bytes memory data) ERC1967Proxy(implementation, data) {}
}
