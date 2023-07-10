const RewardManager = artifacts.require('./RewardManager.sol')
const ITemNFT = artifacts.require('./ITemNFT.sol')
const contracts = require('./utils/contracts')
const {
  catchRevertWithReason
} = require('./utils/exceptions.js')
const messageSigner = require('./utils/messageSigner')
require('colors')
const utils = require('./utils')
const {accountsMap} = require('./utils')
const merkleTree = require('./utils/merkleTree')

let eatherBonusInstance

contract('EatherBonus', (accounts) => {
  before(() => {
    const adminAddress = messageSigner.getAddressFromPrivateKey(process.env.PRIVATE_KEY_ADMIN_FOR_TEST)
    const {
      mainAdmin,
    } = utils.getAccounts(accounts)
    if (adminAddress.toLowerCase() !== mainAdmin.toLowerCase()) {
      console.log('please update PRIVATE_KEY_ADMIN_FOR_TEST in .env with first key from ganache-cli'.red)
      exit(1)
    }
  })
  describe('II. User', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        eatherBonusInstance = await contracts.initEatherBonusInstance(accounts)
      })
      it ('Can get bonus normal', async () => {
        const user = accountsMap.user1
        const quantity = 1
        await getBonus(user, quantity, false)
      })
      it ('Can get bonus normal 2', async () => {
        const user = accountsMap.user1
        const quantity = 2
        await getBonus(user, quantity, false)
      })
      it ('Can get bonus in whitelist', async () => {
        const user = accountsMap.user1
        const quantity = 1
        await getBonus(user, quantity, true)
      })
    })
    describe('B. Fail', async () => {
      beforeEach(async () => {
        eatherBonusInstance = await contracts.initEatherBonusInstance(accounts)
      })
      it ('When get bonus 2 twice a day', async () => {
        const user = accountsMap.user1
        const quantity = 1
        await getBonus(user, quantity)
        await catchRevertWithReason(getBonus(user, quantity), 'EatherBonus: see you tomorrow')
      })
    })
  })
})

async function loadRewardManagerInstance() {
  const rewardManagerInstanceAddress = await eatherBonusInstance.rewardManager()
  return RewardManager.at(rewardManagerInstanceAddress)
}

async function loadItemInstance() {
  const loadItemInstanceAddress = await eatherBonusInstance.itemNFT()
  return ITemNFT.at(loadItemInstanceAddress)
}

async function getBonus(user, quantity, useWhitelist = false) {
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const signature = messageSigner.signMessageGetBonus(eatherBonusInstance.address, {
    user,
    timestamp,
    quantity
  })
  const userOption = {
    from: user
  }
  let path = []
  if (useWhitelist) {
    const whiteList = [user, accountsMap.user2]
    path = await getPath(whiteList, user)
  }
  const response = await eatherBonusInstance.getBonus(signature, timestamp, quantity, path, userOption)
  const rewardManagerInstance = await loadRewardManagerInstance()
  const dailyQuestCompleted = await eatherBonusInstance.claimMarker(user, await rewardManagerInstance.getDaysPassed())
  dailyQuestCompleted.should.be.true
  const success = response.logs[0].args.success
  console.log({success})
  if (success) {
    const itemNFTInstance = await loadItemInstance()
    const balance = await itemNFTInstance.balanceOf(user)
    balance.toNumber().should.equal(quantity)
  }
  console.log('response', response.receipt.gasUsed / 21000 * 0.000105 * 300)
  return success
}

async function getPath(whiteList, user) {
  const tree = merkleTree.genMerkleTree(whiteList)
  await eatherBonusInstance.setRootHash(tree.root.hash)
  return merkleTree.getMerklePath(tree, user, whiteList.indexOf(user))
}
