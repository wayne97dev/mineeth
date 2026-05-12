// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

interface IPick {
    function balanceOf(address account) external view returns (uint256);
    function totalMints() external view returns (uint256);
    function totalMiningMinted() external view returns (uint256);
}

/// @title MinerAgent
/// @notice Soulbound ERC-721 collection that gives each PICK holder a
///         self-contained on-chain identity, ERC-8004 aligned. One agent
///         NFT per address; transfers are blocked because the token
///         represents proof of participation, not a tradeable asset.
///         Metadata + image are generated on-chain from live PICK state,
///         so the badge reflects the holder's current standing without
///         off-chain hosting.
contract MinerAgent is ERC721 {
    using Strings for uint256;
    using Strings for address;

    IPick public immutable pick;
    uint256 public totalAgents;

    /// @notice tokenId minted to each address, 0 if never claimed.
    mapping(address => uint256) public agentIdOf;

    error AlreadyClaimed();
    error NotEligible();
    error Soulbound();
    error NonexistentAgent();

    event AgentMinted(address indexed agent, uint256 indexed tokenId, uint256 pickHeldAtClaim);

    constructor(IPick pick_) ERC721("PICK Miner Agent", "PMA") {
        pick = pick_;
    }

    /// @notice Mint one MinerAgent NFT to `msg.sender`. Eligibility = holds
    ///         any non-zero amount of PICK. One claim per address, ever.
    function claim() external returns (uint256 tokenId) {
        if (agentIdOf[msg.sender] != 0)         revert AlreadyClaimed();
        if (pick.balanceOf(msg.sender) == 0)    revert NotEligible();

        unchecked { tokenId = ++totalAgents; }
        agentIdOf[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);

        emit AgentMinted(msg.sender, tokenId, pick.balanceOf(msg.sender));
    }

    // ───────── Soulbound transfer block ─────────

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // allow mint (from == 0) and burn (to == 0); block transfers between EOAs.
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    // ───────── Dynamic on-chain metadata ─────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentAgent();
        address owner = _ownerOf(tokenId);
        uint256 pickHeld = pick.balanceOf(owner);
        return _buildTokenURI(tokenId, owner, pickHeld);
    }

    function _buildTokenURI(uint256 tokenId, address owner, uint256 pickHeld)
        internal pure returns (string memory)
    {
        string memory tier = _tier(pickHeld);
        string memory image = Base64.encode(bytes(_svg(tokenId, owner, pickHeld, tier)));
        string memory json = _buildJson(tokenId, owner, pickHeld, tier, image);
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _buildJson(uint256 tokenId, address owner, uint256 pickHeld, string memory tier, string memory image)
        internal pure returns (string memory)
    {
        return string(abi.encodePacked(
            '{"name":"PICK Miner Agent #', tokenId.toString(), '",',
            '"description":"ERC-8004 aligned identity for a PICK participant. Soulbound; reflects live PICK holdings of the agent wallet.",',
            '"image":"data:image/svg+xml;base64,', image, '",',
            '"attributes":[',
                '{"trait_type":"Tier","value":"', tier, '"},',
                '{"trait_type":"PICK Held","display_type":"number","value":', (pickHeld / 1e18).toString(), '},',
                '{"trait_type":"Agent Wallet","value":"', Strings.toHexString(uint160(owner), 20), '"}',
            ']}'
        ));
    }

    function _tier(uint256 pickHeld) internal pure returns (string memory) {
        if (pickHeld >= 10_000e18) return "Gold";
        if (pickHeld >= 1_000e18)  return "Silver";
        if (pickHeld >= 100e18)    return "Bronze";
        return "Initiate";
    }

    function _tierColor(string memory tier) internal pure returns (string memory) {
        bytes32 h = keccak256(bytes(tier));
        if (h == keccak256("Gold"))   return "#f4c430";
        if (h == keccak256("Silver")) return "#c0c0c8";
        if (h == keccak256("Bronze")) return "#cd7f32";
        return "#7a7a82";
    }

    function _svg(uint256 tokenId, address owner, uint256 pickHeld, string memory tier)
        internal pure returns (string memory)
    {
        string memory color = _tierColor(tier);
        return string(abi.encodePacked(
            _svgHeader(color),
            _svgBody(tokenId, owner, pickHeld, color),
            _svgFooter(tier, color)
        ));
    }

    function _svgHeader(string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
              '<rect width="400" height="400" fill="#08080a"/>',
              '<rect x="14" y="14" width="372" height="372" fill="none" stroke="', color, '" stroke-width="1" opacity="0.4"/>',
              '<text x="28" y="46" fill="', color, '" font-family="monospace" font-size="13" font-weight="700" letter-spacing="2">$PICK MINER AGENT</text>',
              '<text x="28" y="64" fill="#5a5a62" font-family="monospace" font-size="9" letter-spacing="3">ERC-8004 IDENTITY</text>'
        ));
    }

    function _svgBody(uint256 tokenId, address owner, uint256 pickHeld, string memory color)
        internal pure returns (string memory)
    {
        string memory addrShort = string(abi.encodePacked(
            "0x", _hexSlice(uint160(owner), 36, 40),
            unicode"…",
            _hexSlice(uint160(owner), 0, 4)
        ));
        return string(abi.encodePacked(
            '<text x="28" y="220" fill="#ededed" font-family="monospace" font-size="64" font-weight="700">#', tokenId.toString(), '</text>',
            '<text x="28" y="252" fill="#c8c8cc" font-family="monospace" font-size="13">', addrShort, '</text>',
            '<text x="28" y="306" fill="#8a8a92" font-family="monospace" font-size="9" letter-spacing="2">PICK HELD</text>',
            '<text x="28" y="338" fill="', color, '" font-family="monospace" font-size="28" font-weight="700">', (pickHeld / 1e18).toString(), '</text>'
        ));
    }

    function _svgFooter(string memory tier, string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="372" y="372" fill="', color, '" font-family="monospace" font-size="10" font-weight="700" text-anchor="end" letter-spacing="2">', _upper(tier), '</text>',
            '</svg>'
        ));
    }

    function _hexSlice(uint160 v, uint256 fromNibble, uint256 toNibble) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory out = new bytes(toNibble - fromNibble);
        for (uint256 i = 0; i < out.length; i++) {
            uint256 nibble = (uint256(v) >> ((toNibble - 1 - (fromNibble + i)) * 4)) & 0xf;
            out[i] = hexChars[nibble];
        }
        return string(out);
    }

    function _upper(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length);
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (c >= 0x61 && c <= 0x7a) out[i] = bytes1(uint8(c) - 32);
            else out[i] = c;
        }
        return string(out);
    }
}
