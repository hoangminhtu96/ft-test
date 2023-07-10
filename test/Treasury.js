const Citizen = artifacts.require('./Citizen.sol')
const HeroNFT = artifacts.require('./HeroNFT.sol')
const ITemNFT = artifacts.require('./ITemNFT.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const { listenEvent, accountsMap, value1000BN, value1000String, value100BN, BN } = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevert,
  catchRevertWithReason
} = require('./utils/exceptions.js')
const DURATION_7DAYS = 7 * 24 * 60 * 60
const GENE_NOMAL = 0
const KIND_HERO = 0
const KIND_ITEM = 1
const TYPE_TRADING = 0
const GENE_HUMAN = 0
const CLASS_0 = 1
const CLASS_1 = 2
const CURRENCY_FOTA = 0
const HERO_PRICE = value100BN
const ITEM_PRICE = value100BN
let treasuryInstance
let marketPlaceInstance
contract('Treasury', (accounts) => {
  describe('A. Success', async () => {
    beforeEach(async () => {
      const { treasury, marketPlace } = await contracts.initTreasuryInstance(accounts)
      treasuryInstance = treasury
      marketPlaceInstance = marketPlace
      await register(accountsMap.user1)
    })
    it('Can buy back hero', async () => {
      await grantHeroMintingRight()
      const tokenId = await userListAHero(accountsMap.user1)
      await fundFota(treasuryInstance.address)
      await treasuryInstance.buyBack(KIND_HERO, [tokenId])
      const heroNFTInstance = await loadHeroInstance()
      await catchRevert(heroNFTInstance.ownerOf(tokenId))
    })
    it('Can buy back item', async () => {
      await grantItemMintingRight()
      const tokenId = await userListAnItem(accountsMap.user1)
      await fundFota(treasuryInstance.address)
      await treasuryInstance.buyBack(KIND_ITEM, [tokenId])
      const itemNFTInstance = await loadItemInstance()
      await catchRevert(itemNFTInstance.ownerOf(tokenId))
    })
    it('Can burn', async () => {
      const fotaTokenInstance = await loadFotaInstance()
      const balanceBefore = await fotaTokenInstance.balanceOf(treasuryInstance.address)
      const burningAmount = balanceBefore.div(new BN('2'))
      await treasuryInstance.burn(burningAmount)
      const balanceAfter = await fotaTokenInstance.balanceOf(treasuryInstance.address)
      balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.sub(burningAmount))
    })
  })
})

async function loadHeroInstance() {
  const heroAddress = await marketPlaceInstance.nftTokens(KIND_HERO)
  return HeroNFT.at(heroAddress)
}

async function loadItemInstance() {
  const itemAddress = await marketPlaceInstance.nftTokens(KIND_ITEM)
  return ITemNFT.at(itemAddress)
}

async function grantHeroMintingRight() {
  const heroNFTInstance = await loadHeroInstance()
  await heroNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
}

async function listHeroes() {
  await grantHeroMintingRight()
  return marketPlaceInstance.listHeroes(2, GENE_HUMAN, CLASS_0)
}

function getTokenIdFromResponse(response, index = 0) {
  return response.receipt.logs[index].args.tokenId
}

async function fundFota(user) {
  const fotaTokenInstanceInstance = await loadFotaInstance(marketPlaceInstance)
  await fotaTokenInstanceInstance.releaseGameAllocation(user, value1000BN)
  const balance = await fotaTokenInstanceInstance.balanceOf(user)
  balance.should.be.a.bignumber.that.equals(value1000String)
}

async function loadFotaInstance() {
  const fotaAddress = await marketPlaceInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function register(user, userName = 'USERNAME') {
  const citizenInstance = await loadCitizenInstance(marketPlaceInstance)
  await citizenInstance.register(user, userName, accountsMap.zeroAddress, accountsMap.validAccount1Option)
}

async function loadCitizenInstance() {
  const citizenAddress = await marketPlaceInstance.citizen()
  return Citizen.at(citizenAddress)
}

async function userListAHero(user, type = TYPE_TRADING) {
  const {
    tokenId,
    heroNFTInstance
  } = await mintAHero(user)
  await heroNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
  await setMinLevel(0)
  const listHeroResponse = await marketPlaceInstance.makeOrder(type, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
  listenEvent(listHeroResponse, 'OrderCreated')
  return tokenId
}

async function mintAHero(user) {
  const heroNFTInstance = await loadHeroInstance()
  await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
  await heroNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
  const response = await heroNFTInstance.mintHero(user, CLASS_0, HERO_PRICE, 0)
  const tokenId = await getTokenIdFromResponse(response)
  return {
    tokenId,
    heroNFTInstance
  }
}

async function setMinLevel(minLevel) {
  await marketPlaceInstance.setMinLevel(minLevel)
  const newMinLevel = await marketPlaceInstance.minLevel()
  newMinLevel.toNumber().should.equal(minLevel)
}

async function grantItemMintingRight() {
  const itemNFTInstance = await loadItemInstance()
  await itemNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
}

async function userListAnItem(user, type = TYPE_TRADING) {
  const {
    tokenId,
    itemNFTInstance
  } = await mintAnItem(user, CLASS_1)
  await marketPlaceInstance.setMinGene(0)
  await itemNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
  await setMinLevel(0)
  const listHeroResponse = await marketPlaceInstance.makeOrder(type, KIND_ITEM, tokenId, ITEM_PRICE, ITEM_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
  listenEvent(listHeroResponse, 'OrderCreated')
  return tokenId
}

async function mintAnItem(user, itemClass) {
  const itemNFTInstance = await loadItemInstance()
  await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
  await itemNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
  const response = await itemNFTInstance.mintItem(user, GENE_NOMAL, itemClass, ITEM_PRICE, 0)
  const tokenId = await getTokenIdFromResponse(response)
  return {
    tokenId,
    itemNFTInstance
  }
}
