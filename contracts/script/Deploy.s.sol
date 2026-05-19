// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {APTToken} from "../src/APTToken.sol";
import {PetNFT} from "../src/PetNFT.sol";
import {PetMarketplace} from "../src/PetMarketplace.sol";

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

        vm.stopBroadcast();
    }
}
