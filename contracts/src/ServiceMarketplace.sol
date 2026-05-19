// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Service vouchers and milestone-escrow agreements for veterinary providers.
///
/// Two primitives:
///   1. ServiceVoucher (ERC-1155) — redeemable coupons minted by verified providers
///      e.g. "15% off senior bloodwork" or "1 free dental cleaning"
///   2. MilestoneAgreement — escrow for multi-stage treatments (surgery + recovery)
///      Funds are released to the provider per milestone, preventing full upfront payment.
///
/// Free Adoption NFTs: flagged at creation, cannot be re-listed for ADOPTION_LOCK_PERIOD.
contract ServiceMarketplace is ERC1155, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    uint256 public constant ADOPTION_LOCK_PERIOD = 365 days;
    uint256 private _nextVoucherId;
    uint256 private _nextAgreementId;

    // ── Service Vouchers ─────────────────────────────────────────────────────

    struct VoucherType {
        address provider;       // vet / groomer who minted
        string metadataURI;     // IPFS: name, description, discount terms
        uint256 priceUsdc;      // 0 = free / gift
        uint256 maxSupply;
        uint256 minted;
        bool isAdoption;        // adoption vouchers have a re-list lock
        bool active;
    }

    mapping(uint256 => VoucherType) public voucherTypes;
    // voucherId => holder => timestamp first acquired (for adoption lock)
    mapping(uint256 => mapping(address => uint256)) public adoptionAcquiredAt;

    // ── Milestone Agreements ─────────────────────────────────────────────────

    enum AgreementStatus { Active, Completed, Cancelled }

    struct Milestone {
        string description;
        uint256 amount;      // USDC (6 decimals)
        bool released;
    }

    struct Agreement {
        address client;
        address provider;
        uint256 totalAmount;
        Milestone[] milestones;
        AgreementStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Agreement) public agreements;

    // ── Events ───────────────────────────────────────────────────────────────

    event VoucherTypeCreated(uint256 indexed id, address indexed provider, string metadataURI, uint256 price);
    event VoucherPurchased(uint256 indexed id, address indexed buyer, uint256 amount);
    event VoucherRedeemed(uint256 indexed id, address indexed holder, address indexed provider);
    event AgreementCreated(uint256 indexed id, address indexed client, address indexed provider, uint256 total);
    event MilestoneReleased(uint256 indexed agreementId, uint256 milestoneIndex, uint256 amount);
    event AgreementCancelled(uint256 indexed id, uint256 refunded);

    constructor(address _usdc, address _owner) ERC1155("") Ownable(_owner) {
        usdc = IERC20(_usdc);
    }

    // ── Voucher Functions ────────────────────────────────────────────────────

    /// @notice Providers create a voucher type. Zero price = adoption / gift.
    function createVoucherType(
        string calldata metadataURI,
        uint256 priceUsdc,
        uint256 maxSupply,
        bool isAdoption
    ) external returns (uint256 id) {
        id = _nextVoucherId++;
        voucherTypes[id] = VoucherType({
            provider: msg.sender,
            metadataURI: metadataURI,
            priceUsdc: priceUsdc,
            maxSupply: maxSupply,
            minted: 0,
            isAdoption: isAdoption,
            active: true
        });
        emit VoucherTypeCreated(id, msg.sender, metadataURI, priceUsdc);
    }

    /// @notice Buy vouchers with USDC. Quantity can be > 1 for gifting.
    function buyVoucher(uint256 id, uint256 quantity) external nonReentrant {
        VoucherType storage v = voucherTypes[id];
        require(v.active, "ServiceMarketplace: not active");
        require(v.minted + quantity <= v.maxSupply, "ServiceMarketplace: supply exhausted");

        uint256 total = v.priceUsdc * quantity;
        if (total > 0) {
            usdc.safeTransferFrom(msg.sender, v.provider, total);
        }

        v.minted += quantity;
        _mint(msg.sender, id, quantity, "");

        if (v.isAdoption && adoptionAcquiredAt[id][msg.sender] == 0) {
            adoptionAcquiredAt[id][msg.sender] = block.timestamp;
        }

        emit VoucherPurchased(id, msg.sender, quantity);
    }

    /// @notice Redeem a voucher at the provider. Burns 1 token.
    function redeemVoucher(uint256 id) external nonReentrant {
        VoucherType storage v = voucherTypes[id];
        require(balanceOf(msg.sender, id) >= 1, "ServiceMarketplace: no voucher");
        _burn(msg.sender, id, 1);
        emit VoucherRedeemed(id, msg.sender, v.provider);
    }

    /// @notice Adoption vouchers cannot be transferred for ADOPTION_LOCK_PERIOD.
    function safeTransferFrom(
        address from, address to, uint256 id, uint256 amount, bytes memory data
    ) public override nonReentrant {
        VoucherType storage v = voucherTypes[id];
        if (v.isAdoption) {
            uint256 acquired = adoptionAcquiredAt[id][from];
            require(
                acquired == 0 || block.timestamp >= acquired + ADOPTION_LOCK_PERIOD,
                "ServiceMarketplace: adoption lock active"
            );
        }
        super.safeTransferFrom(from, to, id, amount, data);
        if (v.isAdoption && adoptionAcquiredAt[id][to] == 0) {
            adoptionAcquiredAt[id][to] = block.timestamp;
        }
    }

    function uri(uint256 id) public view override returns (string memory) {
        return voucherTypes[id].metadataURI;
    }

    // ── Milestone Agreement Functions ────────────────────────────────────────

    /// @notice Client creates an escrow agreement with a provider.
    /// @param provider    Vet / specialist wallet.
    /// @param descriptions Per-milestone descriptions (e.g. "Pre-op", "Surgery", "Recovery").
    /// @param amounts     USDC amounts per milestone. Must sum to totalAmount.
    function createAgreement(
        address provider,
        string[] calldata descriptions,
        uint256[] calldata amounts
    ) external nonReentrant returns (uint256 id) {
        require(descriptions.length == amounts.length && amounts.length > 0, "ServiceMarketplace: invalid milestones");

        uint256 total;
        for (uint256 i; i < amounts.length; i++) total += amounts[i];

        usdc.safeTransferFrom(msg.sender, address(this), total);

        id = _nextAgreementId++;
        Agreement storage a = agreements[id];
        a.client = msg.sender;
        a.provider = provider;
        a.totalAmount = total;
        a.status = AgreementStatus.Active;
        a.createdAt = block.timestamp;

        for (uint256 i; i < descriptions.length; i++) {
            a.milestones.push(Milestone({ description: descriptions[i], amount: amounts[i], released: false }));
        }

        emit AgreementCreated(id, msg.sender, provider, total);
    }

    /// @notice Provider releases a specific milestone after completing that stage.
    function releaseMilestone(uint256 agreementId, uint256 milestoneIndex) external nonReentrant {
        Agreement storage a = agreements[agreementId];
        require(a.status == AgreementStatus.Active, "ServiceMarketplace: not active");
        require(msg.sender == a.provider, "ServiceMarketplace: not provider");
        Milestone storage m = a.milestones[milestoneIndex];
        require(!m.released, "ServiceMarketplace: already released");

        m.released = true;
        usdc.safeTransfer(a.provider, m.amount);

        emit MilestoneReleased(agreementId, milestoneIndex, m.amount);

        // Auto-complete when all milestones done
        bool allDone = true;
        for (uint256 i; i < a.milestones.length; i++) {
            if (!a.milestones[i].released) { allDone = false; break; }
        }
        if (allDone) a.status = AgreementStatus.Completed;
    }

    /// @notice Client cancels and gets refund of unreleased milestones.
    function cancelAgreement(uint256 agreementId) external nonReentrant {
        Agreement storage a = agreements[agreementId];
        require(a.status == AgreementStatus.Active, "ServiceMarketplace: not active");
        require(msg.sender == a.client, "ServiceMarketplace: not client");

        uint256 refund;
        for (uint256 i; i < a.milestones.length; i++) {
            if (!a.milestones[i].released) refund += a.milestones[i].amount;
        }

        a.status = AgreementStatus.Cancelled;
        if (refund > 0) usdc.safeTransfer(a.client, refund);

        emit AgreementCancelled(agreementId, refund);
    }

    function getMilestones(uint256 agreementId) external view returns (Milestone[] memory) {
        return agreements[agreementId].milestones;
    }
}
