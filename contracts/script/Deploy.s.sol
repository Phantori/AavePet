// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {APTToken} from "../src/APTToken.sol";
import {PetNFT} from "../src/PetNFT.sol";
import {PetMarketplace} from "../src/PetMarketplace.sol";
import {PetVault} from "../src/PetVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        APTToken apt = new APTToken(deployer);
        console.log("APTToken deployed at:", address(apt));

        PetNFT nft = new PetNFT(deployer);
        console.log("PetNFT deployed at:", address(nft));

        PetMarketplace marketplace = new PetMarketplace(
            address(apt),
            address(nft),
            deployer, // fee recipient — replace with multisig in production
            deployer
        );
        console.log("PetMarketplace deployed at:", address(marketplace));

        // aAPT token address on Base — update if APT gets listed on Aave
        // For now deploy with a placeholder; wire up after Aave listing
        address aAptToken = address(0); // TODO: replace with real aToken after APT Aave listing
        PetVault vault = new PetVault(address(apt), aAptToken, PetVault.AAVE_POOL_BASE(), deployer);
        console.log("PetVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
