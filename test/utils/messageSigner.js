const { ecsign, privateToAddress } = require('ethereumjs-util')
const { getMessage } = require('eip-712')

const EIP712_NAME = 'FOTA'
const EIP712_VERSION = '1'
const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
]
const UpgradeItemDatas = [
  { name: 'user', type: 'address' },
  { name: 'seed', type: 'string' },
  { name: 'nonce', type: 'uint256' }
]
const BuySaleDatas = [
  { name: 'user', type: 'address' },
  { name: 'allocated', type: 'uint256' },
  { name: 'price', type: 'uint256' }
]
const SyncData = [
  { name: 'user', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'totalValue', type: 'uint256' },
  { name: 'timestamp', type: 'uint256' }
]
const SummonHero = [
  { name: 'user', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'classId', type: 'uint16' },
  { name: 'timestamp', type: 'uint256' }
]

function signMessageBuyPrivateSale(verifyingContract, message, chainId = 1) {
  const typedData = {
    types: {
      EIP712Domain,
      Buy: BuySaleDatas
    },
    primaryType: 'Buy',
    domain: {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract
    },
    message
  };
  const privateKey = Buffer.from(process.env.PRIVATE_KEY_ADMIN_FOR_TEST, 'hex')

  const messageFromData = getMessage(typedData, true)
  const { r, s, v } = ecsign(messageFromData, privateKey)
  return `0x${r.toString('hex')}${s.toString('hex')}${v.toString(16)}`
}

function signMessageUpgradeItem(verifyingContract, message, chainId = 1) {
  const typedData = {
    types: {
      EIP712Domain,
      UpgradeItem: UpgradeItemDatas
    },
    primaryType: 'UpgradeItem',
    domain: {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract
    },
    message
  };
  const privateKey = Buffer.from(process.env.PRIVATE_KEY_ADMIN_FOR_TEST, 'hex')

  const messageFromData = getMessage(typedData, true)
  const { r, s, v } = ecsign(messageFromData, privateKey)
  return `0x${r.toString('hex')}${s.toString('hex')}${v.toString(16)}`
}

function signMessageUpgradeSkill(verifyingContract, message, chainId = 1) {
  const typedData = {
    types: {
      EIP712Domain,
      SkillUp: UpgradeItemDatas
    },
    primaryType: 'SkillUp',
    domain: {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract
    },
    message
  };
  const privateKey = Buffer.from(process.env.PRIVATE_KEY_ADMIN_FOR_TEST, 'hex')

  const messageFromData = getMessage(typedData, true)
  const { r, s, v } = ecsign(messageFromData, privateKey)
  return `0x${r.toString('hex')}${s.toString('hex')}${v.toString(16)}`
}

function signMessageFinishGame(verifyingContract, message, chainId = 1) {
  const typedData = {
    types: {
      EIP712Domain,
      SyncData
    },
    primaryType: 'SyncData',
    domain: {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract
    },
    message
  };
  // console.log('typedData', JSON.stringify(typedData, null, 2))
  const privateKey = Buffer.from(process.env.PRIVATE_KEY_ADMIN_FOR_TEST, 'hex')

  const messageFromData = getMessage(typedData, true)
  const { r, s, v } = ecsign(messageFromData, privateKey)
  return `0x${r.toString('hex')}${s.toString('hex')}${v.toString(16)}`
}

function signMessageSummonHero(verifyingContract, message, chainId = 1) {
  const typedData = {
    types: {
      EIP712Domain,
      SummonHero
    },
    primaryType: 'SummonHero',
    domain: {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract
    },
    message
  };
  // console.log('typedData', JSON.stringify(typedData, null, 2))
  const privateKey = Buffer.from(process.env.PRIVATE_KEY_ADMIN_FOR_TEST, 'hex')

  const messageFromData = getMessage(typedData, true)
  const { r, s, v } = ecsign(messageFromData, privateKey)
  return `0x${r.toString('hex')}${s.toString('hex')}${v.toString(16)}`
}

function getAddressFromPrivateKey(key) {
  const account = privateToAddress(new Buffer(key, 'hex'))
  return `0x${account.toString('hex')}`
}

// async function getKey(index) {
//   const walletPath = {
//     standard: `m/44'/60'/0'/0/${index}`
//   }
//   const hdnode = ethers.utils.HDNode.fromMnemonic(process.env.MMNEMONIC)
//   const node = hdnode.derivePath(walletPath.standard)
//   return node.privateKey
// }

function signMessageGetBonus(verifyingContract, message, chainId = 1) {
  const typedData = {
    types: {
      EIP712Domain,
      GetBonus: [
        { name: 'user', type: 'address' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'quantity', type: 'uint256' }
      ]
    },
    primaryType: 'GetBonus',
    domain: {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract
    },
    message
  }
  const privateKey = Buffer.from(process.env.PRIVATE_KEY_ADMIN_FOR_TEST, 'hex')

  const messageFromData = getMessage(typedData, true)
  const { r, s, v } = ecsign(messageFromData, privateKey)
  return `0x${r.toString('hex')}${s.toString('hex')}${v.toString(16)}`
}


module.exports = {
  getAddressFromPrivateKey,
  signMessageBuyPrivateSale,
  signMessageGetBonus,
  signMessageSummonHero,
  signMessageUpgradeItem,
  signMessageUpgradeSkill,
  signMessageFinishGame,
  EIP712_NAME,
  EIP712_VERSION
  // getKey
}
