// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

interface IIdentityRegistry {
    function register(string memory agentURI) external returns (uint256 agentId);
    function setAgentURI(uint256 agentId, string memory newURI) external;
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice Registers PICK as an ERC-8004 agent on the Ethereum mainnet
///         Identity Registry (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432).
///         Run AFTER the Pick mainnet deploy and after agent.json is live
///         at the custom domain.
///
/// Required env:
///   AGENT_URI = https://your-domain/agent.json
///   (and PRIVATE_KEY or --account, the wallet that becomes the agent NFT owner)
///
/// Example:
///   AGENT_URI=https://pick-eth.com/agent.json \
///   forge script script/RegisterAgent.s.sol \
///     --rpc-url $MAINNET_RPC --account pick-mainnet --broadcast
contract RegisterAgent is Script {
    address constant IDENTITY_REGISTRY_MAINNET = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address constant IDENTITY_REGISTRY_SEPOLIA = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    function _registry() internal view returns (address) {
        if (block.chainid == 1)        return IDENTITY_REGISTRY_MAINNET;
        if (block.chainid == 11155111) return IDENTITY_REGISTRY_SEPOLIA;
        revert("Unsupported chain; add registry address to script");
    }

    function run() external {
        string memory uri = vm.envString("AGENT_URI");
        address registry = _registry();
        console2.log("Agent URI: ", uri);
        console2.log("Registry:  ", registry);
        console2.log("Chain ID:  ", block.chainid);

        vm.startBroadcast();
        uint256 agentId = IIdentityRegistry(registry).register(uri);
        vm.stopBroadcast();

        console2.log("Agent ID:  ", agentId);
        console2.log("Owner:     ", IIdentityRegistry(registry).ownerOf(agentId));
        console2.log("URI on chain:", IIdentityRegistry(registry).tokenURI(agentId));
    }
}
