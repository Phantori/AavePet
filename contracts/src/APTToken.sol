// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice AavePet Token (APT) — the native utility token of the AavePet ecosystem.
/// Used for marketplace payments, veterinary services, and governance (future).
contract APTToken is ERC20, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether; // 1 billion APT

    constructor(address initialOwner)
        ERC20("AavePet Token", "APT")
        ERC20Permit("AavePet Token")
        Ownable(initialOwner)
    {
        // Mint initial supply to deployer; distribution handled via vesting/airdrop contracts
        _mint(initialOwner, 100_000_000 ether); // 10% initial circulating
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "APT: max supply exceeded");
        _mint(to, amount);
    }
}
