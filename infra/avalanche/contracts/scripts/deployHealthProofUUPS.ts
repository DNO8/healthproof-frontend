import { ethers, network } from "hardhat";

/**
 * UUPS Proxy Deployment Script for HealthProof Protocol
 * 
 * This script deploys all registries as UUPS upgradeable proxies.
 * The Kernel remains non-upgradeable as the router.
 */

async function deployUUPSProxy(
    contractName: string,
    implementation: any,
    initArgs: any[]
): Promise<{ proxy: any, implAddress: string }> {
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    
    const initData = implementation.interface.encodeFunctionData("initialize", initArgs);
    
    const proxy = await ERC1967Proxy.deploy(
        await implementation.getAddress(),
        initData
    );
    await proxy.waitForDeployment();
    
    return { 
        proxy: implementation.attach(await proxy.getAddress()),
        implAddress: await implementation.getAddress()
    };
}

async function main() {

    console.log("--------------------------------------------------");
    console.log("HealthProof Protocol Deployment - UUPS Proxy Version");
    console.log("Network:", network.name);
    console.log("--------------------------------------------------");

    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error(
            "No deployer account found. Configure PRIVATE_KEY in .env for the selected network."
        );
    }

    console.log("Deployer:", deployer.address);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "HVE");

    console.log("\nStarting deployment with UUPS proxies...\n");

    /*
    --------------------------------------------------
    0. TrustedForwarder (EIP-2771) - Non-upgradeable
    --------------------------------------------------
    */

    const HealthProofTrustedForwarder = await ethers.getContractFactory("HealthProofTrustedForwarder");
    const trustedForwarder = await HealthProofTrustedForwarder.deploy();
    await trustedForwarder.waitForDeployment();
    const trustedForwarderAddress = await trustedForwarder.getAddress();
    console.log("✓ HealthProofTrustedForwarder:", trustedForwarderAddress);

    /*
    --------------------------------------------------
    1. IdentityRegistry (UUPS Proxy)
    --------------------------------------------------
    */

    console.log("\n--- Deploying IdentityRegistry ---");
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identityImpl = await IdentityRegistry.deploy();
    await identityImpl.waitForDeployment();
    console.log("  Implementation:", await identityImpl.getAddress());

    const { proxy: identityRegistry } = await deployUUPSProxy(
        "IdentityRegistry",
        identityImpl,
        []
    );
    const identityAddress = await identityRegistry.getAddress();
    console.log("✓ IdentityRegistry Proxy:", identityAddress);

    /*
    --------------------------------------------------
    2. GuardianRegistry (UUPS Proxy)
    --------------------------------------------------
    */

    console.log("\n--- Deploying GuardianRegistry ---");
    const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
    const guardianImpl = await GuardianRegistry.deploy();
    await guardianImpl.waitForDeployment();
    console.log("  Implementation:", await guardianImpl.getAddress());

    const { proxy: guardianRegistry } = await deployUUPSProxy(
        "GuardianRegistry",
        guardianImpl,
        [identityAddress, trustedForwarderAddress]
    );
    const guardianAddress = await guardianRegistry.getAddress();
    console.log("✓ GuardianRegistry Proxy:", guardianAddress);

    /*
    --------------------------------------------------
    3. PermissionManager (UUPS Proxy)
    --------------------------------------------------
    */

    console.log("\n--- Deploying PermissionManager ---");
    const PermissionManager = await ethers.getContractFactory("PermissionManager");
    const permissionImpl = await PermissionManager.deploy();
    await permissionImpl.waitForDeployment();
    console.log("  Implementation:", await permissionImpl.getAddress());

    const { proxy: permissionManager } = await deployUUPSProxy(
        "PermissionManager",
        permissionImpl,
        [identityAddress, guardianAddress, trustedForwarderAddress]
    );
    const permissionAddress = await permissionManager.getAddress();
    console.log("✓ PermissionManager Proxy:", permissionAddress);

    /*
    --------------------------------------------------
    4. ClinicalEpisodeRegistry (UUPS Proxy)
    --------------------------------------------------
    */

    console.log("\n--- Deploying ClinicalEpisodeRegistry ---");
    const ClinicalEpisodeRegistry = await ethers.getContractFactory("ClinicalEpisodeRegistry");
    const episodeImpl = await ClinicalEpisodeRegistry.deploy();
    await episodeImpl.waitForDeployment();
    console.log("  Implementation:", await episodeImpl.getAddress());

    const { proxy: clinicalEpisodeRegistry } = await deployUUPSProxy(
        "ClinicalEpisodeRegistry",
        episodeImpl,
        [identityAddress, trustedForwarderAddress]
    );
    const episodeAddress = await clinicalEpisodeRegistry.getAddress();
    console.log("✓ ClinicalEpisodeRegistry Proxy:", episodeAddress);

    /*
    --------------------------------------------------
    5. MedicalOrderRegistry (UUPS Proxy)
    --------------------------------------------------
    */

    console.log("\n--- Deploying MedicalOrderRegistry ---");
    const MedicalOrderRegistry = await ethers.getContractFactory("MedicalOrderRegistry");
    const orderImpl = await MedicalOrderRegistry.deploy();
    await orderImpl.waitForDeployment();
    console.log("  Implementation:", await orderImpl.getAddress());

    const { proxy: medicalOrderRegistry } = await deployUUPSProxy(
        "MedicalOrderRegistry",
        orderImpl,
        [identityAddress, trustedForwarderAddress]
    );
    const orderAddress = await medicalOrderRegistry.getAddress();
    console.log("✓ MedicalOrderRegistry Proxy:", orderAddress);

    /*
    --------------------------------------------------
    6. MedicalDocumentRegistry (UUPS Proxy)
    --------------------------------------------------
    */

    console.log("\n--- Deploying MedicalDocumentRegistry ---");
    const MedicalDocumentRegistry = await ethers.getContractFactory("MedicalDocumentRegistry");
    const documentImpl = await MedicalDocumentRegistry.deploy();
    await documentImpl.waitForDeployment();
    console.log("  Implementation:", await documentImpl.getAddress());

    const { proxy: medicalDocumentRegistry } = await deployUUPSProxy(
        "MedicalDocumentRegistry",
        documentImpl,
        [identityAddress, trustedForwarderAddress]
    );
    const documentAddress = await medicalDocumentRegistry.getAddress();
    console.log("✓ MedicalDocumentRegistry Proxy:", documentAddress);

    /*
    --------------------------------------------------
    7. HealthcareNetworkRegistry (Non-upgradeable - no state to preserve)
    --------------------------------------------------
    */

    console.log("\n--- Deploying HealthcareNetworkRegistry ---");
    const HealthcareNetworkRegistry = await ethers.getContractFactory("HealthcareNetworkRegistry");
    const healthcareNetworkRegistry = await HealthcareNetworkRegistry.deploy();
    await healthcareNetworkRegistry.waitForDeployment();
    const networkRegistryAddress = await healthcareNetworkRegistry.getAddress();
    console.log("✓ HealthcareNetworkRegistry:", networkRegistryAddress);

    /*
    --------------------------------------------------
    8. AuditTrail (Non-upgradeable)
    --------------------------------------------------
    */

    console.log("\n--- Deploying AuditTrail ---");
    const AuditTrail = await ethers.getContractFactory("AuditTrail");
    const auditTrail = await AuditTrail.deploy();
    await auditTrail.waitForDeployment();
    const auditAddress = await auditTrail.getAddress();
    console.log("✓ AuditTrail:", auditAddress);

    /*
    --------------------------------------------------
    9. HealthProofKernel (Non-upgradeable - immutable router)
    --------------------------------------------------
    */

    console.log("\n--- Deploying HealthProofKernel ---");
    const HealthProofKernel = await ethers.getContractFactory("HealthProofKernel");
    const kernel = await HealthProofKernel.deploy(
        deployer.address,
        deployer.address,
        deployer.address
    );
    await kernel.waitForDeployment();
    const kernelAddress = await kernel.getAddress();
    console.log("✓ HealthProofKernel:", kernelAddress);

    /*
    --------------------------------------------------
    10. HealthProofGateway (Non-upgradeable - will be redeployed for upgrades)
    --------------------------------------------------
    */

    console.log("\n--- Deploying HealthProofGateway ---");
    const HealthProofGateway = await ethers.getContractFactory("HealthProofGateway");
    const gateway = await HealthProofGateway.deploy(
        kernelAddress,
        identityAddress,
        guardianAddress,
        trustedForwarderAddress
    );
    await gateway.waitForDeployment();
    const gatewayAddress = await gateway.getAddress();
    console.log("✓ HealthProofGateway:", gatewayAddress);

    /*
    --------------------------------------------------
    11. HealthProofProtocol (Non-upgradeable)
    --------------------------------------------------
    */

    console.log("\n--- Deploying HealthProofProtocol ---");
    const HealthProofProtocol = await ethers.getContractFactory("HealthProofProtocol");
    const protocol = await HealthProofProtocol.deploy(
        permissionAddress,
        documentAddress,
        auditAddress
    );
    await protocol.waitForDeployment();
    const protocolAddress = await protocol.getAddress();
    console.log("✓ HealthProofProtocol:", protocolAddress);

    /*
    --------------------------------------------------
    12. Set Gateway in Registries
    --------------------------------------------------
    */

    console.log("\n--- Configuring Gateway in Registries ---");

    // Register gateway as DOCTOR in IdentityRegistry
    await (await identityRegistry.registerEntity(gatewayAddress, 1, "gateway", ethers.ZeroAddress)).wait();
    await (await identityRegistry.verifyEntity(gatewayAddress)).wait();
    console.log("✓ Gateway registered as DOCTOR");

    // Set gateway in MedicalOrderRegistry
    await (await medicalOrderRegistry.setGateway(gatewayAddress)).wait();
    console.log("✓ Gateway set in MedicalOrderRegistry");

    // Set gateway in ClinicalEpisodeRegistry
    await (await clinicalEpisodeRegistry.setGateway(gatewayAddress)).wait();
    console.log("✓ Gateway set in ClinicalEpisodeRegistry");

    /*
    --------------------------------------------------
    13. Register Kernel Modules
    --------------------------------------------------
    */

    console.log("\n--- Registering Kernel Modules ---");

    const EPISODE_MODULE = ethers.keccak256(ethers.toUtf8Bytes("EPISODE_MODULE"));
    const ORDER_MODULE = ethers.keccak256(ethers.toUtf8Bytes("ORDER_MODULE"));
    const DOCUMENT_MODULE = ethers.keccak256(ethers.toUtf8Bytes("DOCUMENT_MODULE"));
    const PERMISSION_MODULE = ethers.keccak256(ethers.toUtf8Bytes("PERMISSION_MODULE"));

    await (await kernel.registerModule(EPISODE_MODULE, episodeAddress)).wait();
    console.log("✓ EPISODE_MODULE registered");

    await (await kernel.registerModule(ORDER_MODULE, orderAddress)).wait();
    console.log("✓ ORDER_MODULE registered");

    await (await kernel.registerModule(DOCUMENT_MODULE, documentAddress)).wait();
    console.log("✓ DOCUMENT_MODULE registered");

    await (await kernel.registerModule(PERMISSION_MODULE, permissionAddress)).wait();
    console.log("✓ PERMISSION_MODULE registered");

    /*
    --------------------------------------------------
    14. Bootstrap: Register Deployer as ADMIN
    --------------------------------------------------
    */

    console.log("\n--- Bootstrap: Registering Deployer ---");

    await (await identityRegistry.registerEntity(
        deployer.address,
        5, // Role.ADMIN
        "",
        ethers.ZeroAddress
    )).wait();
    await (await identityRegistry.verifyEntity(deployer.address)).wait();
    console.log("✓ Deployer registered as ADMIN and verified");

    /*
    --------------------------------------------------
    Deployment Summary
    --------------------------------------------------
    */

    console.log("\n" + "=".repeat(60));
    console.log("HealthProof Deployment Summary (UUPS Proxy Version)");
    console.log("=".repeat(60));

    console.log("\n--- Infrastructure ---");
    console.log("HealthProofTrustedForwarder (EIP-2771):", trustedForwarderAddress);
    console.log("HealthProofKernel:", kernelAddress);
    console.log("HealthProofGateway:", gatewayAddress);
    console.log("HealthProofProtocol:", protocolAddress);

    console.log("\n--- UUPS Upgradeable Registries (Proxies) ---");
    console.log("IdentityRegistry Proxy:", identityAddress);
    console.log("GuardianRegistry Proxy:", guardianAddress);
    console.log("PermissionManager Proxy:", permissionAddress);
    console.log("ClinicalEpisodeRegistry Proxy:", episodeAddress);
    console.log("MedicalOrderRegistry Proxy:", orderAddress);
    console.log("MedicalDocumentRegistry Proxy:", documentAddress);

    console.log("\n--- Non-upgradeable Contracts ---");
    console.log("HealthcareNetworkRegistry:", networkRegistryAddress);
    console.log("AuditTrail:", auditAddress);

    console.log("\n" + "=".repeat(60));
    console.log("Deployment complete!");
    console.log("=".repeat(60));

    console.log("\n--- Upgrade Information ---");
    console.log("To upgrade a registry, deploy a new implementation and call");
    console.log("upgradeTo(newImplementationAddress) on the proxy contract.");
    console.log("Only the proxy owner (deployer) can authorize upgrades.");

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
