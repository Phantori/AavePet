// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {APTToken} from "../src/APTToken.sol";
import {PetNFT} from "../src/PetNFT.sol";
import {PetMarketplace} from "../src/PetMarketplace.sol";
import {PetVault} from "../src/PetVault.sol";
import {RainbowBridge} from "../src/RainbowBridge.sol";
import {ServiceMarketplace} from "../src/ServiceMarketplace.sol";
import {PetCreditLine} from "../src/PetCreditLine.sol";
import {PetHeraldry} from "../src/PetHeraldry.sol";

contract Deploy is Script {
    // Base mainnet — Aave v3
    address constant AAVE_POOL         = 0xA238Dd80C259a72e81d7e4664a9801593F98d1c5;
    address constant USDC              = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant A_USDC            = 0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB;
    address constant WETH              = 0x4200000000000000000000000000000000000006;
    address constant A_WETH            = 0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7;
    address constant VAR_DEBT_USDC     = 0x59dca05b6c26dbd64b5381374aAaC5CD05644C28;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        APTToken apt = new APTToken(deployer);
        console.log("APTToken         :", address(apt));

        PetNFT nft = new PetNFT(deployer);
        console.log("PetNFT           :", address(nft));

        PetMarketplace marketplace = new PetMarketplace(
            address(apt), address(nft),
            deployer, // fee recipient — replace with multisig before mainnet
            deployer
        );
        console.log("PetMarketplace   :", address(marketplace));

        PetVault usdcVault = new PetVault(USDC, A_USDC, AAVE_POOL, "USDC", deployer);
        console.log("USDC Vault       :", address(usdcVault));

        PetVault wethVault = new PetVault(WETH, A_WETH, AAVE_POOL, "WETH", deployer);
        console.log("WETH Vault       :", address(wethVault));

        RainbowBridge bridge = new RainbowBridge(address(nft));
        console.log("RainbowBridge    :", address(bridge));

        ServiceMarketplace services = new ServiceMarketplace(USDC, deployer);
        console.log("ServiceMarketplace:", address(services));

        PetCreditLine creditLine = new PetCreditLine(
            AAVE_POOL, USDC, VAR_DEBT_USDC, address(wethVault), deployer
        );
        console.log("PetCreditLine    :", address(creditLine));

        PetHeraldry heraldry = new PetHeraldry(
            deployer,
            address(nft),
            address(usdcVault),
            address(wethVault),
            address(creditLine)
        );
        console.log("PetHeraldry      :", address(heraldry));

        vm.stopBroadcast();
    }
}
