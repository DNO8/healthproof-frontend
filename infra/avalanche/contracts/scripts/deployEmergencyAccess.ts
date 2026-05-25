import { ethers, network } from "hardhat";

/**
 * Deploy & Upgrade Script for EmergencyAccessManager (Break-the-Glass)
 *
 * 1. Deploy EmergencyAccessManager (UUPS Proxy)
 * 2. Upgrade GuardianRegistry (add hasActiveGuardian)
 * 3. Upgrade PermissionManager (add emergency fallback)
 * 4. Redeploy AuditTrail (new ActionTypes)
 * 5. Set EmergencyAccessManager in PermissionManager
 */

async function deployUUPSProxy(
  contractName: string,
  implementation: any,
  initArgs: any[]
): Promise<{ proxy: any; implAddress: string }> {
  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const initData = implementation.interface.encodeFunctionData("initialize", initArgs);
  const proxy = await ERC1967Proxy.deploy(await implementation.getAddress(), initData);
  await proxy.waitForDeployment();
  return {
    proxy: implementation.attach(await proxy.getAddress()),
    implAddress: await implementation.getAddress(),
  };
}

async function main() {
  console.log("--------------------------------------------------");
  console.log("EmergencyAccessManager Deploy + Upgrades");
  console.log("Network:", network.name);
  console.log("--------------------------------------------------");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Current proxy addresses (from env / DEPLOY_HYGIEIA.md)
  const PROXY_ADDRESSES = {
    IdentityRegistry: "0x68EA48917a3f9416613A48788BCe54578395a315",
    GuardianRegistry: "0xE742a4b5F98453027fA3A9b0de106e237B6746B1",
    PermissionManager: "0xb91b7959e715c059cE10eBEbe3288dA9d8012961",
    AuditTrail: "0x1AA001Cd20F35F3F4EF1A945053CeE4Acc24aDb4",
    TrustedForwarder: "0xC76413e3c098DC67cfdE4C2E92351792EC6924bf",
  };

  // --- 1. Deploy EmergencyAccessManager (UUPS Proxy) ---
  console.log("\n--- Deploying EmergencyAccessManager ---");
  const EmergencyAccessManager = await ethers.getContractFactory("EmergencyAccessManager");
  const emergencyImpl = await EmergencyAccessManager.deploy();
  await emergencyImpl.waitForDeployment();
  console.log("  Implementation:", await emergencyImpl.getAddress());

  const { proxy: emergencyManager } = await deployUUPSProxy(
    "EmergencyAccessManager",
    emergencyImpl,
    [
      PROXY_ADDRESSES.IdentityRegistry,
      PROXY_ADDRESSES.GuardianRegistry,
      PROXY_ADDRESSES.TrustedForwarder,
    ]
  );
  const emergencyAddress = await emergencyManager.getAddress();
  console.log("  Proxy:", emergencyAddress);

  // --- 2. Upgrade GuardianRegistry (hasActiveGuardian) ---
  console.log("\n--- Upgrading GuardianRegistry ---");
  const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
  const newGuardianImpl = await GuardianRegistry.deploy();
  await newGuardianImpl.waitForDeployment();
  console.log("  New Implementation:", await newGuardianImpl.getAddress());

  const guardianProxy = await ethers.getContractAt("GuardianRegistry", PROXY_ADDRESSES.GuardianRegistry);
  const guardianUpgradeTx = await guardianProxy.upgradeTo(await newGuardianImpl.getAddress());
  await guardianUpgradeTx.wait();
  console.log("  GuardianRegistry upgraded");

  // --- 3. Upgrade PermissionManager (emergency fallback) ---
  console.log("\n--- Upgrading PermissionManager ---");
  const PermissionManager = await ethers.getContractFactory("PermissionManager");
  const newPermissionImpl = await PermissionManager.deploy();
  await newPermissionImpl.waitForDeployment();
  console.log("  New Implementation:", await newPermissionImpl.getAddress());

  const permissionProxy = await ethers.getContractAt("PermissionManager", PROXY_ADDRESSES.PermissionManager);
  const permissionUpgradeTx = await permissionProxy.upgradeTo(await newPermissionImpl.getAddress());
  await permissionUpgradeTx.wait();
  console.log("  PermissionManager upgraded");

  // --- 4. Set EmergencyAccessManager in PermissionManager ---
  console.log("\n--- Linking EmergencyAccessManager to PermissionManager ---");
  const setEmergencyTx = await permissionProxy.setEmergencyAccessManager(emergencyAddress);
  await setEmergencyTx.wait();
  console.log("  EmergencyAccessManager linked");

  // --- 5. Redeploy AuditTrail (new ActionTypes) ---
  console.log("\n--- Redeploying AuditTrail ---");
  const AuditTrail = await ethers.getContractFactory("AuditTrail");
  const newAuditTrail = await AuditTrail.deploy();
  await newAuditTrail.waitForDeployment();
  const newAuditTrailAddress = await newAuditTrail.getAddress();
  console.log("  New AuditTrail:", newAuditTrailAddress);

  console.log("\n" + "=".repeat(60));
  console.log("EmergencyAccessManager Deployment Complete");
  console.log("=".repeat(60));
  console.log("\nNew / Updated Addresses:");
  console.log("  EmergencyAccessManager Proxy:", emergencyAddress);
  console.log("  EmergencyAccessManager Impl:", await emergencyImpl.getAddress());
  console.log("  GuardianRegistry New Impl:", await newGuardianImpl.getAddress());
  console.log("  PermissionManager New Impl:", await newPermissionImpl.getAddress());
  console.log("  AuditTrail (redeployed):", newAuditTrailAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
