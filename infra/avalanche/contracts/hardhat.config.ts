import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    hygieia: {
      url:
        process.env.HYGIEIA_RPC_URL ||
        "http://3.141.110.34:9654/ext/bc/2GyyV9JKfw3ZqLHVra8UzJ53avgFZbAvVRjVXQnVjPYM2xsNYq/rpc",
      chainId: 21668,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;

