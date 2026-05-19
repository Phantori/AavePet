// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for querying the pet NFT owner.
interface IPetNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice Health records vault with per-pet access control lists.
/// The pet owner may grant/revoke vet access to add and read records.
/// All records are stored on-chain as IPFS CID references with a record type label.
contract PetRecords {

    // ── Custom errors ─────────────────────────────────────────────────────────

    error NotOwner();
    error NotAuthorized();
    error InvalidCID();

    // ── Storage ───────────────────────────────────────────────────────────────

    struct Record {
        string  cid;
        string  recordType;
        uint256 timestamp;
        address addedBy;
    }

    /// @notice IPFS records stored per tokenId.
    mapping(uint256 => Record[]) public records;

    /// @notice Vet access grants: tokenId => address => granted.
    mapping(uint256 => mapping(address => bool)) public vetAccess;

    /// @notice Number of records stored per tokenId (mirrors records[tokenId].length).
    mapping(uint256 => uint256) public recordCount;

    /// @notice The pet NFT contract used to check ownership.
    IPetNFT public petNFT;

    // ── Events ────────────────────────────────────────────────────────────────

    event AccessGranted(uint256 indexed tokenId, address indexed vet);
    event AccessRevoked(uint256 indexed tokenId, address indexed vet);
    event RecordAdded(
        uint256 indexed tokenId,
        string  cid,
        string  recordType,
        address indexed addedBy,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address petNFT_) {
        petNFT = IPetNFT(petNFT_);
    }

    // ── Access control ────────────────────────────────────────────────────────

    /// @notice Grant a vet address read/write access to a pet's records.
    /// Only the pet owner may call this.
    /// @param tokenId The pet NFT token ID.
    /// @param vet     The address to grant access to.
    function grantAccess(uint256 tokenId, address vet) external {
        if (petNFT.ownerOf(tokenId) != msg.sender) revert NotOwner();
        vetAccess[tokenId][vet] = true;
        emit AccessGranted(tokenId, vet);
    }

    /// @notice Revoke a vet address's access to a pet's records.
    /// Only the pet owner may call this.
    /// @param tokenId The pet NFT token ID.
    /// @param vet     The address to revoke access from.
    function revokeAccess(uint256 tokenId, address vet) external {
        if (petNFT.ownerOf(tokenId) != msg.sender) revert NotOwner();
        vetAccess[tokenId][vet] = false;
        emit AccessRevoked(tokenId, vet);
    }

    // ── Record management ─────────────────────────────────────────────────────

    /// @notice Add a health record for a pet.
    /// Caller must be the pet owner or a granted vet.
    /// @param tokenId    The pet NFT token ID.
    /// @param cid        The IPFS CID of the record document.
    /// @param recordType A label describing the record type (e.g. "vaccination", "xray").
    function addRecord(
        uint256 tokenId,
        string calldata cid,
        string calldata recordType
    ) external {
        if (!hasAccess(tokenId, msg.sender)) revert NotAuthorized();
        if (bytes(cid).length == 0) revert InvalidCID();

        records[tokenId].push(Record({
            cid:        cid,
            recordType: recordType,
            timestamp:  block.timestamp,
            addedBy:    msg.sender
        }));
        recordCount[tokenId] += 1;

        emit RecordAdded(tokenId, cid, recordType, msg.sender, block.timestamp);
    }

    /// @notice Retrieve all health records for a pet.
    /// Caller must be the pet owner or a granted vet.
    /// @param tokenId The pet NFT token ID.
    /// @return        The full array of records.
    function getRecords(uint256 tokenId) external view returns (Record[] memory) {
        if (!hasAccess(tokenId, msg.sender)) revert NotAuthorized();
        return records[tokenId];
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /// @notice Check whether an address has access to a pet's records.
    /// Returns true if `who` is the owner or has been granted vet access.
    /// @param tokenId The pet NFT token ID.
    /// @param who     The address to check.
    function hasAccess(uint256 tokenId, address who) public view returns (bool) {
        return petNFT.ownerOf(tokenId) == who || vetAccess[tokenId][who];
    }
}
