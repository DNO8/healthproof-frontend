import { ethers, network } from "hardhat";

/**
 * UUPS Upgrade Script for MedicalOrderRegistry and ClinicalEpisodeRegistry
 * Deploys new implementations and calls upgradeTo() on the existing proxies.
 */

async function main() {
    console.log("--------------------------------------------------");
    console.log("HealthProof Registry Upgrade - UUPS Proxy");
    console.log("Network:", network.name);
    console.log("--------------------------------------------------");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Hygieia proxy addresses (from DEPLOY_HYGIEIA.md)
    const PROXY_ADDRESSES = {
        MedicalOrderRegistry: "0x3D02577e25EED5B66379820de3A0884862b32a1d",
        ClinicalEpisodeRegistry: "0x3807004AFa19A77EBbcD1e25dAA443F9b55A565d",
    };

    // --- Upgrade MedicalOrderRegistry ---
    console.log("\n--- Deploying new MedicalOrderRegistry implementation ---");
    const MedicalOrderRegistry = await ethers.getContractFactory("MedicalOrderRegistry");
    const newOrderImpl = await MedicalOrderRegistry.deploy();
    await newOrderImpl.waitForDeployment();
    const newOrderImplAddress = await newOrderImpl.getAddress();
    console.log("  New Implementation:", newOrderImplAddress);

    console.log("  Calling upgradeTo on MedicalOrderRegistry proxy...");
    const orderProxy = await ethers.getContractAt("MedicalOrderRegistry", PROXY_ADDRESSES.MedicalOrderRegistry);
    const orderUpgradeTx = await orderProxy.upgradeTo(newOrderImplAddress);
    await orderUpgradeTx.wait();
    console.log("  ✓ MedicalOrderRegistry upgraded");

    // --- Upgrade ClinicalEpisodeRegistry ---
    console.log("\n--- Deploying new ClinicalEpisodeRegistry implementation ---");
    const ClinicalEpisodeRegistry = await ethers.getContractFactory("ClinicalEpisodeRegistry");
    const newEpisodeImpl = await ClinicalEpisodeRegistry.deploy();
    await newEpisodeImpl.waitForDeployment();
    const newEpisodeImplAddress = await newEpisodeImpl.getAddress();
    console.log("  New Implementation:", newEpisodeImplAddress);

    console.log("  Calling upgradeTo on ClinicalEpisodeRegistry proxy...");
    const episodeProxy = await ethers.getContractAt("ClinicalEpisodeRegistry", PROXY_ADDRESSES.ClinicalEpisodeRegistry);
    const episodeUpgradeTx = await episodeProxy.upgradeTo(newEpisodeImplAddress);
    await episodeUpgradeTx.wait();
    console.log("  ✓ ClinicalEpisodeRegistry upgraded");

    console.log("\n" + "=".repeat(60));
    console.log("Upgrade Complete");
    console.log("=".repeat(60));
    console.log("\nNew Implementation Addresses:");
    console.log("  MedicalOrderRegistry:", newOrderImplAddress);
    console.log("  ClinicalEpisodeRegistry:", newEpisodeImplAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
