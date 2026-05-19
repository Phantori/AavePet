// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPetHeraldry {
    function packFounder(bytes32 packId) external view returns (address);
    function packOf(address member) external view returns (bytes32);
}

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IERC20Short {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @notice Pack mutual-aid treasury that deposits idle USDC to Aave v3 and allows
/// emergency claim payouts gated by the pack founder.
contract PackTreasury {

    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice Maximum single-claim size expressed in basis points (30%).
    uint256 public constant MAX_CLAIM_BPS = 3000;

    // ── Immutables ────────────────────────────────────────────────────────────

    address public usdc;
    address public aToken;
    address public aavePool;
    IPetHeraldry public heraldry;

    // ── Storage ───────────────────────────────────────────────────────────────

    /// @notice Total USDC principal deposited per pack.
    mapping(bytes32 => uint256) public treasuryDeposited;

    /// @notice Per-member USDC principal contribution within a pack.
    mapping(bytes32 => mapping(address => uint256)) public memberDeposit;

    /// @notice Claim record. Uses a nested mapping for voted so it cannot be
    /// returned from a getter as-is; external code should use the view helpers.
    struct Claim {
        address requester;
        address recipient;
        uint256 amount;
        string  reason;
        bool    executed;
        bool    rejected;
        uint256 approvalCount;
        mapping(address => bool) voted;
    }

    /// @notice All claims per pack, indexed by claimId.
    mapping(bytes32 => Claim[]) public claims;

    // ── Events ────────────────────────────────────────────────────────────────

    event Deposited(bytes32 indexed packId, address indexed member, uint256 amount);
    event Withdrawn(bytes32 indexed packId, address indexed member, uint256 amount);
    event ClaimFiled(bytes32 indexed packId, uint256 indexed claimId, address indexed requester, address recipient, uint256 amount, string reason);
    event ClaimVoted(bytes32 indexed packId, uint256 indexed claimId, address indexed voter);
    event ClaimExecuted(bytes32 indexed packId, uint256 indexed claimId, address recipient, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address usdc_,
        address aToken_,
        address aavePool_,
        address heraldry_
    ) {
        usdc     = usdc_;
        aToken   = aToken_;
        aavePool = aavePool_;
        heraldry = IPetHeraldry(heraldry_);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /// @dev Revert if msg.sender is not a member of packId.
    modifier onlyPackMember(bytes32 packId) {
        require(heraldry.packOf(msg.sender) == packId, "PackTreasury: not a pack member");
        _;
    }

    // ── Deposit / Withdraw ────────────────────────────────────────────────────

    /// @notice Deposit USDC into the pack treasury. Funds are immediately supplied to Aave v3.
    /// @param packId The pack identifier.
    /// @param amount Amount of USDC to deposit (6 decimals).
    function deposit(bytes32 packId, uint256 amount) external onlyPackMember(packId) {
        require(amount > 0, "PackTreasury: amount must be > 0");

        // Pull USDC from caller.
        bool ok = IERC20Short(usdc).transferFrom(msg.sender, address(this), amount);
        require(ok, "PackTreasury: transferFrom failed");

        // Approve and supply to Aave.
        IERC20Short(usdc).approve(aavePool, amount);
        IAavePool(aavePool).supply(usdc, amount, address(this), 0);

        // Update accounting.
        treasuryDeposited[packId]             += amount;
        memberDeposit[packId][msg.sender]     += amount;

        emit Deposited(packId, msg.sender, amount);
    }

    /// @notice Withdraw up to the caller's principal share from the pack treasury.
    /// @param packId The pack identifier.
    /// @param amount Amount of USDC to withdraw.
    function withdraw(bytes32 packId, uint256 amount) external onlyPackMember(packId) {
        require(amount > 0, "PackTreasury: amount must be > 0");
        require(memberDeposit[packId][msg.sender] >= amount, "PackTreasury: exceeds your deposit share");

        // Update accounting before external call (checks-effects-interactions).
        memberDeposit[packId][msg.sender] -= amount;
        treasuryDeposited[packId]         -= amount;

        // Withdraw from Aave directly to caller.
        IAavePool(aavePool).withdraw(usdc, amount, msg.sender);

        emit Withdrawn(packId, msg.sender, amount);
    }

    // ── Claims ────────────────────────────────────────────────────────────────

    /// @notice File an emergency claim request from the pack treasury.
    /// Amount must not exceed MAX_CLAIM_BPS (30%) of the total pack treasury.
    /// @param packId    The pack identifier.
    /// @param recipient Address that will receive the funds if the claim is executed.
    /// @param amount    USDC amount requested.
    /// @param reason    Human-readable reason for the claim.
    function fileClaim(
        bytes32 packId,
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyPackMember(packId) {
        require(recipient != address(0), "PackTreasury: invalid recipient");
        require(amount > 0, "PackTreasury: amount must be > 0");

        uint256 total = treasuryDeposited[packId];
        require(total > 0, "PackTreasury: empty treasury");

        uint256 maxAllowed = (total * MAX_CLAIM_BPS) / 10_000;
        require(amount <= maxAllowed, "PackTreasury: claim exceeds 30% of treasury");

        // Push a new Claim. Note: mapping fields inside structs in storage arrays are
        // zero-initialised by default.
        uint256 claimId = claims[packId].length;
        claims[packId].push();
        Claim storage c = claims[packId][claimId];
        c.requester     = msg.sender;
        c.recipient     = recipient;
        c.amount        = amount;
        c.reason        = reason;
        // executed, rejected, approvalCount default to false/0

        emit ClaimFiled(packId, claimId, msg.sender, recipient, amount, reason);
    }

    /// @notice Vote to approve a claim. Only the pack founder may approve (founder-gated release).
    /// Once the founder votes, approvalCount reaches 1 and the claim becomes executable.
    /// @param packId   The pack identifier.
    /// @param claimId  Index into claims[packId].
    function voteClaim(bytes32 packId, uint256 claimId) external {
        require(msg.sender == heraldry.packFounder(packId), "PackTreasury: only pack founder can vote");
        require(claimId < claims[packId].length, "PackTreasury: invalid claimId");

        Claim storage c = claims[packId][claimId];
        require(!c.executed, "PackTreasury: already executed");
        require(!c.rejected, "PackTreasury: claim rejected");
        require(!c.voted[msg.sender], "PackTreasury: already voted");

        c.voted[msg.sender] = true;
        c.approvalCount    += 1;

        emit ClaimVoted(packId, claimId, msg.sender);
    }

    /// @notice Execute an approved claim after the founder has voted.
    /// Withdraws from Aave and transfers to the claim recipient.
    /// @param packId   The pack identifier.
    /// @param claimId  Index into claims[packId].
    function executeClaim(bytes32 packId, uint256 claimId) external {
        require(claimId < claims[packId].length, "PackTreasury: invalid claimId");

        Claim storage c = claims[packId][claimId];
        require(!c.executed, "PackTreasury: already executed");
        require(!c.rejected, "PackTreasury: claim rejected");
        require(c.approvalCount >= 1, "PackTreasury: not yet approved by founder");

        uint256 amount   = c.amount;
        address recipient = c.recipient;

        require(treasuryDeposited[packId] >= amount, "PackTreasury: treasury too small");

        // Mark executed before external calls (checks-effects-interactions).
        c.executed = true;
        treasuryDeposited[packId] -= amount;

        // Withdraw from Aave and send to recipient.
        IAavePool(aavePool).withdraw(usdc, amount, recipient);

        emit ClaimExecuted(packId, claimId, recipient, amount);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /// @notice Estimate accrued yield for a member (proportional aToken share minus principal).
    /// Returns 0 if the treasury is empty or the member has no deposit.
    /// @param packId The pack identifier.
    /// @return Estimated yield in USDC for the caller's proportional share.
    function treasuryYield(bytes32 packId) external view returns (uint256) {
        uint256 totalPrincipal = treasuryDeposited[packId];
        if (totalPrincipal == 0) return 0;

        uint256 memberShare = memberDeposit[packId][msg.sender];
        if (memberShare == 0) return 0;

        uint256 aTokenBal = IERC20Short(aToken).balanceOf(address(this));
        uint256 memberATokenShare = (aTokenBal * memberShare) / totalPrincipal;

        return memberATokenShare > memberShare ? memberATokenShare - memberShare : 0;
    }

    /// @notice Returns the number of claims filed for a pack.
    function claimCount(bytes32 packId) external view returns (uint256) {
        return claims[packId].length;
    }

    /// @notice Returns basic claim fields (excluding the internal voted mapping).
    function getClaim(bytes32 packId, uint256 claimId)
        external
        view
        returns (
            address requester,
            address recipient,
            uint256 amount,
            string memory reason,
            bool executed,
            bool rejected,
            uint256 approvalCount
        )
    {
        require(claimId < claims[packId].length, "PackTreasury: invalid claimId");
        Claim storage c = claims[packId][claimId];
        return (c.requester, c.recipient, c.amount, c.reason, c.executed, c.rejected, c.approvalCount);
    }
}
