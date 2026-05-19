// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BioSparkDNA} from "../src/lib/BioSparkDNA.sol";
import {HeraldryRenderer} from "../src/lib/HeraldryRenderer.sol";
import {PetNFT} from "../src/PetNFT.sol";
import {PetHeraldry} from "../src/PetHeraldry.sol";

// Minimal stubs for vault / credit line
contract StubVault {
    function deposits(uint256, address) external pure returns (uint256) { return 500 * 1e6; }
    function yieldForPet(uint256) external pure returns (uint256) { return 5 * 1e6; }
}

contract StubVaultEmpty {
    function deposits(uint256, address) external pure returns (uint256) { return 0; }
    function yieldForPet(uint256) external pure returns (uint256) { return 0; }
}

contract StubCreditLine {
    function borrows(uint256, address) external pure returns (uint256) { return 50 * 1e6; }
}

contract PetHeraldryTest is Test {
    PetNFT     nft;
    PetHeraldry heraldry;
    StubVault  usdcVault;
    StubVault  wethVault;
    StubCreditLine creditLine;

    address alice = address(0xA11CE);

    function setUp() public {
        nft       = new PetNFT(address(this));
        usdcVault = new StubVault();
        wethVault = new StubVault();
        creditLine = new StubCreditLine();

        heraldry = new PetHeraldry(
            address(this),
            address(nft),
            address(usdcVault),
            address(wethVault),
            address(creditLine)
        );
    }

    function test_DNAGenerated() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://test");
        uint256 dna = nft.tokenDNA(tokenId);
        assertTrue(dna != 0, "DNA should be non-zero");
    }

    function test_DNADecode() public {
        uint256 dna = 0xABCDEF1234567890AABBCCDDEEFF00112233445566778899AABBCCDDEEFF0011;
        BioSparkDNA.Traits memory t = BioSparkDNA.decode(dna);
        // species raw = lowest byte = 0x11 = 17 → Canine
        assertEq(t.species, "Canine");
        assertEq(t.generation, 1); // generationRaw = 0x00 ≤ 63 → Gen1
    }

    function test_DNAUnique() public {
        vm.prank(alice);
        uint256 id0 = nft.mint("ipfs://a");
        vm.roll(block.number + 1);
        vm.warp(block.timestamp + 1);
        vm.prank(alice);
        uint256 id1 = nft.mint("ipfs://b");
        assertTrue(nft.tokenDNA(id0) != nft.tokenDNA(id1), "DNA should differ per mint");
    }

    function test_EvaluateMilestones() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://test");

        heraldry.evaluateMilestones(tokenId);
        uint256 c = heraldry.charges(tokenId);

        // StubVault returns 500 USDC → CHARGE_SAVINGS set
        assertTrue(c & HeraldryRenderer.CHARGE_SAVINGS   != 0, "savings charge");
        // StubVault yield > 0 → CHARGE_YIELD set
        assertTrue(c & HeraldryRenderer.CHARGE_YIELD     != 0, "yield charge");
        // StubCreditLine borrow > 0 → CHARGE_CREDIT set
        assertTrue(c & HeraldryRenderer.CHARGE_CREDIT    != 0, "credit charge");
        // 500 < TIER_PLATINUM → no sovereign
        assertFalse(c & HeraldryRenderer.CHARGE_SOVEREIGN != 0, "no sovereign");
    }

    function test_PackFoundAndJoin() public {
        bytes32 pack = keccak256("wolfpack");
        address bob = address(0xB0B);

        vm.prank(alice);
        heraldry.foundPack(pack);
        assertEq(heraldry.packFounder(pack), alice);

        vm.prank(bob);
        heraldry.joinPack(pack);
        assertEq(heraldry.packOf(bob), pack);
    }

    function test_SVGNotEmpty() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://test");
        heraldry.evaluateMilestones(tokenId);

        string memory svg = heraldry.getHeraldrySVG(tokenId, "Buddy");
        assertTrue(bytes(svg).length > 100, "SVG should be non-trivial");
        // Should start with <svg
        assertEq(bytes(svg)[0], bytes("<")[0]);
    }

    function test_TokenURIDataURI() public {
        vm.prank(alice);
        uint256 tokenId = nft.mint("ipfs://test");

        string memory uri = heraldry.getHeraldryURI(tokenId, "Luna");
        // Must start with data:application/json;base64,
        bytes memory b = bytes(uri);
        assertTrue(b.length > 50);
        assertEq(b[0], bytes("d")[0]);
        assertEq(b[4], bytes(":")[0]);
    }

    function test_BinaryArt() public pure {
        uint256 dna = type(uint256).max;
        string memory art = BioSparkDNA.binaryArt(dna);
        assertEq(bytes(art).length, 200);
        assertEq(bytes(art)[0], bytes("1")[0]);
    }
}
