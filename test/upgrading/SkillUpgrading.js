const HeroNFT = artifacts.require('./HeroNFT.sol')
const ITemNFT = artifacts.require('./ITemNFT.sol')
const { listenEvent, accountsMap, getTokenIdFromResponse } = require('../utils')
const contracts = require('../utils/contracts')
const utils = require('../utils')
const {
  catchRevertWithReason
} = require('../utils/exceptions.js')
const messageSigner = require('../utils/messageSigner')
const { HERO_PRICE, ITEM_PRICE } = require('../utils/dataHolder')
require('colors')

let skillUpgradingInstance
let heroNFTInstance
let itemNFTInstance
const eatherGene = 0
const eatherClass = 1
const initClass = 1

contract('SkillUpgrading', (accounts) => {
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
        skillUpgradingInstance = await contracts.initSkillUpgradingContract(accounts)
        itemNFTInstance = await loadItemNFTInstance()
        heroNFTInstance = await loadHeroNFTInstance()
        await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        await itemNFTInstance.updateTransferable(skillUpgradingInstance.address, true)
        await heroNFTInstance.updateTransferable(skillUpgradingInstance.address, true)
        await heroNFTInstance.updateGameContract(skillUpgradingInstance.address, true)
        await heroNFTInstance.updateUpgradingContract(skillUpgradingInstance.address)
      })
      it('can upgrade with all payment types and currencies', async () => {
        await skillUp(accountsMap.user1, 3)
        await skillUp(accountsMap.user1, 3)
        await skillUp(accountsMap.user1, 3)
        await skillUp(accountsMap.user1, 3)
        await skillUp(accountsMap.user1, 3)
        await skillUp(accountsMap.user1, 3)
      })
      it('can upgrade to max level', async () => {
        const maxLevel = 25
        let checkpoint = 0
        for (let i = 1; i <= maxLevel; i++) {
          checkpoint += 10 * i
          await heroNFTInstance.updateExperienceCheckpoint(i + 1, checkpoint)
        }
        await skillUp(accountsMap.user1, maxLevel)
      })
    })
  })
})

async function loadItemNFTInstance() {
  const nftAddress = await skillUpgradingInstance.itemNft()
  return ITemNFT.at(nftAddress)
}

async function loadHeroNFTInstance() {
  const nftAddress = await skillUpgradingInstance.heroNft()
  return HeroNFT.at(nftAddress)
}

async function prepare(user) {
  // mint hero
  const mintHeroResponse = await heroNFTInstance.mintHero(user, initClass, HERO_PRICE, 0)
  const tokenId = getTokenIdFromResponse(mintHeroResponse)
  listenEvent(mintHeroResponse, 'Transfer')
  return tokenId
}

async function skillUp(user, level) {
  const tokenId = await prepare(user)
  for(let i = 2; i <= level; i++) {
    // console.log(`Trying upgrade to level ${i}`)
    await skillUpToLevel(user, tokenId, i)
    console.log(`Skill up to level ${i}`)
  }
}

async function skillUpToLevel(user, tokenId, toLevel) {
  const levelMod5 = (toLevel - 1) % 5
  const experienceUpResponse = await heroNFTInstance.experienceUp(tokenId, 10 * toLevel)
  if (levelMod5 === 1 || levelMod5 === 3) {
    listenEvent(experienceUpResponse, 'LevelUp')
    listenEvent(experienceUpResponse, 'ExperienceUp', 1)
    return
  }
  listenEvent(experienceUpResponse, 'ExperienceUp')

  const userOption = {
    from: user
  }

  // mint eather
  const mintingResponse = await itemNFTInstance.mintItem(user, eatherGene, eatherClass, ITEM_PRICE, 0)
  const eatherId = getTokenIdFromResponse(mintingResponse)
  await itemNFTInstance.setApprovalForAll(skillUpgradingInstance.address, true, userOption)
  listenEvent(mintingResponse, 'Transfer')
  const item = await itemNFTInstance.getItem(eatherId)
  item['3'].should.be.a.bignumber.that.equals(ITEM_PRICE)

  const upgradeResponse = await skillUpgradingInstance.skillUp(tokenId, eatherId, userOption)

  listenEvent(upgradeResponse, 'Upgraded')
  // eather token should be burnt
  await catchRevertWithReason(itemNFTInstance.ownerOf(eatherId), 'ERC721: owner query for nonexistent token')
}
