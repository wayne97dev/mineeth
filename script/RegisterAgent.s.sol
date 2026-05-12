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

    function run() external {
        string memory uri = vm.envString("AGENT_URI");
        console2.log("Agent URI: ", uri);
        console2.log("Registry:  ", IDENTITY_REGISTRY_MAINNET);

        vm.startBroadcast();
        uint256 agentId = IIdentityRegistry(IDENTITY_REGISTRY_MAINNET).register(uri);
        vm.stopBroadcast();

        console2.log("Agent ID:  ", agentId);
        console2.log("Owner:     ", IIdentityRegistry(IDENTITY_REGISTRY_MAINNET).ownerOf(agentId));
        console2.log("URI on chain:", IIdentityRegistry(IDENTITY_REGISTRY_MAINNET).tokenURI(agentId));
    }
}
