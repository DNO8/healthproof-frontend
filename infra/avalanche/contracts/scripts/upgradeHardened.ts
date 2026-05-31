import { ethers, network } from "hardhat";

/**
 * Upgrade script for the Hardening plan (2026-05-31).
 * 
 * Steps:
 * 1. Upgrade 4 UUPS Registries to new implementations
 * 2. Redeploy HealthProofGateway (non-upgradeable)
 * 3. Register new Gateway in IdentityRegistry
 * 4. Set gateway address in all 4 Registries
 * 
 * FILL IN the DEPLOYMENT_CONFIG below with your current Hygieia addresses.
 */

const DEPLOYMENT_CONFIG = {
    // --- UUPS Proxy Addresses (existing on Hygieia) ---
    ClinicalEpisodeRegistry:    "0x207Ac23cf698ce54ad2AE2391be5df4b8c66430F",
    MedicalOrderRegistry:       "0x9E1222D98DBc740bbD406b5945084D363888CeA0",
    MedicalDocumentRegistry:    "0x5b190A85fb41D7C1d173a4501f12b81c28F59824",
    PermissionManager:          "0xb91b7959e715c059cE10eBEbe3288dA9d8012961",

    // --- Existing non-upgradeable contracts (needed for Gateway redeploy) ---
    HealthProofKernel:          "0xcad00692aa206527F64Fc683dB0f711dc49CB176",
    IdentityRegistry:           "0x68EA48917a3f9416613A48788BCe54578395a315",
    GuardianRegistry:           "0xE742a4b5F98453027fA3A9b0de106e237B6746B1",
    HealthProofTrustedForwarder:"0xC76413e3c098DC67cfdE4C2E92351792EC6924bf",
};

async function main() {
    console.log("========================================");
    console.log(" HealthProof Hardening Upgrade + Deploy");
    console.log(" Network:", network.name);
    console.log("========================================");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // --- Validate config ---
    for (const [key, addr] of Object.entries(DEPLOYMENT_CONFIG)) {
        if (addr === ethers.ZeroAddress) {
            throw new Error(`DEPLOYMENT_CONFIG.${key} is not set. Fill it before running.`);
        }
    }

    // ==========================================
    // 1. UPGRADE 4 UUPS REGISTRIES
    // ==========================================
    console.log("\n--- 1. Upgrading UUPS Registries ---");

    const registries = [
        { name: "ClinicalEpisodeRegistry", proxy: DEPLOYMENT_CONFIG.ClinicalEpisodeRegistry },
        { name: "MedicalOrderRegistry",    proxy: DEPLOYMENT_CONFIG.MedicalOrderRegistry },
        { name: "MedicalDocumentRegistry", proxy: DEPLOYMENT_CONFIG.MedicalDocumentRegistry },
        { name: "PermissionManager",       proxy: DEPLOYMENT_CONFIG.PermissionManager },
    ];

    const newImplAddresses: Record<string, string> = {};

    for (const reg of registries) {
        console.log(`\n  Deploying new ${reg.name} implementation...`);
        const Factory = await ethers.getContractFactory(reg.name);
        const impl = await Factory.deploy();
        await impl.waitForDeployment();
        const implAddr = await impl.getAddress();
        newImplAddresses[reg.name] = implAddr;
        console.log(`    New Impl: ${implAddr}`);

        console.log(`    Calling upgradeTo on proxy ${reg.proxy}...`);
        const proxy = await ethers.getContractAt(reg.name, reg.proxy);
        const tx = await proxy.upgradeToAndCall(implAddr, "0x");
        await tx.wait();
        console.log(`    ✓ ${reg.name} upgraded`);
    }

    // ==========================================
    // 2. REDEPLOY HealthProofGateway
    // ==========================================
    console.log("\n--- 2. Redeploying HealthProofGateway ---");

    const GatewayFactory = await ethers.getContractFactory("HealthProofGateway");
    const newGateway = await GatewayFactory.deploy(
        DEPLOYMENT_CONFIG.HealthProofKernel,
        DEPLOYMENT_CONFIG.IdentityRegistry,
        DEPLOYMENT_CONFIG.GuardianRegistry,
        DEPLOYMENT_CONFIG.HealthProofTrustedForwarder
    );
    await newGateway.waitForDeployment();
    const newGatewayAddr = await newGateway.getAddress();
    console.log(`    ✓ New Gateway: ${newGatewayAddr}`);

    // ==========================================
    // 3. REGISTER new Gateway in IdentityRegistry
    // ==========================================
    console.log("\n--- 3. Registering Gateway in IdentityRegistry ---");

    const identity = await ethers.getContractAt("IdentityRegistry", DEPLOYMENT_CONFIG.IdentityRegistry);
    await (await identity.registerEntity(newGatewayAddr, 1, "gateway", ethers.ZeroAddress)).wait();
    await (await identity.verifyEntity(newGatewayAddr)).wait();
    console.log("    ✓ Gateway registered as DOCTOR and verified");

    // ==========================================
    // 4. SET GATEWAY in all 4 Registries
    // ==========================================
    console.log("\n--- 4. Setting Gateway in Registries ---");

    for (const reg of registries) {
        console.log(`    Setting gateway in ${reg.name}...`);
        const proxy = await ethers.getContractAt(reg.name, reg.proxy);
        const tx = await proxy.setGateway(newGatewayAddr);
        await tx.wait();
        console.log(`    ✓ Gateway set in ${reg.name}`);
    }

    // ==========================================
    // 5. SUMMARY
    // ==========================================
    console.log("\n========================================");
    console.log(" SUMMARY");
    console.log("========================================");
    console.log("\nNew Implementation Addresses:");
    for (const [name, addr] of Object.entries(newImplAddresses)) {
        console.log(`  ${name}: ${addr}`);
    }
    console.log(`\nNew HealthProofGateway: ${newGatewayAddr}`);
    console.log("\n⚠️  IMPORTANT: Update your frontend .env with:");
    console.log(`    NEXT_PUBLIC_GATEWAY_ADDRESS=${newGatewayAddr}`);
    console.log("========================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
