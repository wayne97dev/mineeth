// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MinerAgent, IPick} from "../src/MinerAgent.sol";

/// @notice Deploys the MinerAgent NFT contract pointing at an existing
///         Pick deployment. The Pick address must be passed via the
///         PICK_ADDRESS env var (so we never accidentally point at the
///         wrong chain's Pick).
///
///         Example (Sepolia):
///           PICK_ADDRESS=0xf8bcf8AE88B2fd5a67d74a6eeb6c4b5A366AE0Cc \
///           forge script script/DeployMinerAgent.s.sol \
///             --rpc-url $SEPOLIA_RPC --account pick-sepolia --broadcast --verify
contract DeployMinerAgent is Script {
    function run() external {
        address pickAddr = vm.envAddress("PICK_ADDRESS");
        console2.log("Pick:", pickAddr);

        vm.startBroadcast();
        MinerAgent agent = new MinerAgent(IPick(pickAddr));
        vm.stopBroadcast();

        console2.log("MinerAgent:", address(agent));
        console2.log("Name:      ", agent.name());
        console2.log("Symbol:    ", agent.symbol());
    }
}
