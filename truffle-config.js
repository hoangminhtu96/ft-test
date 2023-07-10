require('dotenv').config()
const HDWalletProvider = require('@truffle/hdwallet-provider')

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      // gas: 10000000,
    },
    testnet: {
      provider: function () {
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY_DEV],
          // providerOrUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545'
          providerOrUrl: 'wss://bsc-testnet.nodereal.io/ws/v1/c8bc3ca66ffc4ba3b9cc369fd7d00f21'
        })
      },
      gas: 25000000,
      network_id: 97
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY_PROD],
          providerOrUrl: 'wss://bsc-mainnet.nodereal.io/ws/v1/4746141683c64e3fb7afd3c106ca6866'
        })
      },
      gas: 10000000,
      network_id: 56
    },
    polygonTestnet: {
      provider: function () {
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY_DEV],
          // providerOrUrl: 'https://matic-mumbai.chainstacklabs.com',
          providerOrUrl: 'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78'
        })
      },
      // gas: 20000000,
      network_id: 80001,
    },
    polygon: {
      provider: function () {
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY_PROD],
          // providerOrUrl: 'https://blissful-neat-owl.matic.discover.quiknode.pro/ea5cde0f5b6921f76da7b3ccbb6afa0090c633e9'
          providerOrUrl: 'https://polygon-mainnet.nodereal.io/v1/36b163c5d91e4b79b37f1f3a5795c341'
        })
      },
      network_id: 137,
    },

    mantleTestnet: {
      provider: function () {
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY_DEV],
          providerOrUrl: 'https://rpc.testnet.mantle.xyz/'
        })
      },
      network_id: 5001,
      verify: {
        // network_id: 5001,
        apiUrl: 'https://explorer.testnet.mantle.xyz/api',
        apiKey: 'xyz',
        // apiKey: {
        //   'mantle-testnet': 'xyz',
        // },
        // explorerUrl: 'https://explorer.testnet.mantle.xyz',
      },
    },
  },

  compilers: {
    solc: {
      version: "0.8.0",
      settings: {
        optimizer: {
          enabled: true,
          runs: 1000
        }
      }
    }
  },
  plugins: [
    'truffle-plugin-verify',
    'truffle-contract-size'
  ],
  api_keys: {
    bscscan: 'Q7RZNY9C4CZCCUQ4N7VH7I9Q7GX56I33ZB',
    polygonscan: '7D3Z6DVZSUXTHXTG254XSKHV8YKW66HSFP',
    'mantle-testnet': 'xyz',
  }
}
