const HeroNFT = artifacts.require('./HeroNFT.sol')
const ItemNFT = artifacts.require('./ItemNFT.sol')
const RewardManager = artifacts.require('./RewardManager.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const { getTokenIdFromResponse, listenEvent, accountsMap, value1BN, value3BN, value1000BN, value1000String} = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevert,
  catchRevertWithReason
} = require('./utils/exceptions.js')
const messageSigner = require('./utils/messageSigner')
const {HERO_PRICE} = require('./utils/dataHolder')

let marketPlaceV2Instance
let heroNFTInstance
let itemNFTInstance
const initClass = 1
const AETHER_GENE = 0
const AETHER_CLASS = 1
const ITEM_PRICE = value3BN
const CURRENCY_FOTA = 0
const CURRENCY_BUSD = 1
const TYPE_ALL = 2

contract('MarketPlace', (accounts) => {
  describe('II. User functions', async () => {
    beforeEach(async () => {
      marketPlaceV2Instance = await contracts.initMarketPlaceV2Instance(accounts)
      heroNFTInstance = await loadHeroNFTInstance()
      itemNFTInstance = await loadItemNFTInstance()
      await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
    })
    describe('A. Success', async () => {
      // it ('Can summonHero', async () => {
      //   const tokenId = await summonHero()
      //   const authorizated = await marketPlaceV2Instance.authorizations(tokenId)
      //   authorizated.should.equal(accountsMap.user1)
      // })
      // it ('Can summonPrestigeHero', async () => {
      //   const tokenId = await summonPrestigeHero()
      //   const owner = await heroNFTInstance.ownerOf(tokenId)
      //   owner.should.equal(accountsMap.user1)
      // })
      // it ('Can revokeHero', async () => {
      //   const tokenId = await summonHero()
      //   const revokedHeroResponse = await marketPlaceV2Instance.revokeHeroes([tokenId], accountsMap.mainAdminOption)
      //   const authorizated = await marketPlaceV2Instance.authorizations(tokenId)
      //   authorizated.should.equal(accountsMap.zeroAddress)
      //   listenEvent(revokedHeroResponse, 'HeroesRevoked')
      // })
      // it ('Can makeOrder', async () => {
      //   const heroIds = await mintHeroes(3)
      //   await makeOrder(heroIds, true)
      // })
      // it ('Can cancelOrder', async () => {
      //   const heroIds = await mintHeroes(3)
      //   const orderId = await makeOrder(heroIds, true)
      //   const response = await marketPlaceV2Instance.cancelOrder(orderId, accountsMap.validAccount1Option)
      //   listenEvent(response, 'OrderCanceled')
      // })
      it ('Can takeOrder', async () => {
        const heroIds = await mintHeroes(3)
        const orderId = await makeOrder(heroIds)
        await marketPlaceV2Instance.updatePaymentType(TYPE_ALL)
        const fotaTokenInstance = await fundFota(accountsMap.user2, await loadRewardManagerInstance())
        await fotaTokenInstance.approve(marketPlaceV2Instance.address, value1000BN, accountsMap.validAccount2Option)
        const response = await marketPlaceV2Instance.takeOrder(orderId, CURRENCY_FOTA, accountsMap.validAccount2Option)
        for(let i = 0; i < heroIds.length; i++) {
          const authorized = await marketPlaceV2Instance.authorizations(heroIds[i])
          authorized.should.equal(accountsMap.user2)
        }
        listenEvent(response, 'OrderTaken')
      })
      // it ('Can revokeOrders', async () => {
      //   const heroIds = await mintHeroes(3)
      //   const orderId = await makeOrder(heroIds, true)
      //   await marketPlaceV2Instance.takeOrder(orderId, CURRENCY_FOTA, accountsMap.validAccount2Option)
      //   const response = await marketPlaceV2Instance.revokeOrders([orderId], accountsMap.mainAdminOption)
      //   listenEvent(response, 'OrderRevoked')
      //   for(let i = 0; i < heroIds.length; i++) {
      //     const authorized = await marketPlaceV2Instance.authorizations(heroIds[i])
      //     authorized.should.equal(accountsMap.zeroAddress)
      //   }
      // })
      // it ('Can deposit', async () => {
      //   const rewardManagerInstance = await loadRewardManagerInstance()
      //   const fotaTokenInstanceInstance = await fundFota(accountsMap.user1, rewardManagerInstance)
      //   await fotaTokenInstanceInstance.approve(rewardManagerInstance.address, value1000BN, accountsMap.validAccount1Option)
      //   const response = await rewardManagerInstance.deposit(value1000BN, CURRENCY_FOTA, accountsMap.validAccount1Option)
      //   listenEvent(response, 'Deposited')
      // })
    })
    // describe('B. Fail', async () => {
    //   beforeEach(async () => {
    //     await setMinLevel(0)
    //   })
	  // })
  })
  // describe('I. Admin functions', async () => {
  //   describe('A. Success', async () => {
  //     beforeEach(async () => {
  //       marketPlaceV2Instance = await contracts.initMarketPlaceV2Instance(accounts)
  //     })
  // })
  // describe('B. Fail', async () => {
  //   before(async () => {
  //     marketPlaceV2Instance = await contracts.initMarketPlaceV2Instance(accounts)
  //   })
  // })
  // })
})


async function genSignature(user, classId) {
  let nonce = await marketPlaceV2Instance.nonces(user)
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const signature = messageSigner.signMessageSummonHero(marketPlaceV2Instance.address, {
    user,
    nonce: nonce.toNumber(),
    classId,
    timestamp
  })
  return {
    signature,
    timestamp
  }
}

async function loadHeroNFTInstance() {
  const nftAddress = await marketPlaceV2Instance.heroNft()
  return HeroNFT.at(nftAddress)
}

async function loadItemNFTInstance() {
  const nftAddress = await marketPlaceV2Instance.itemNft()
  return ItemNFT.at(nftAddress)
}

async function loadRewardManagerInstance() {
  const address = await marketPlaceV2Instance.rewardManager()
  return RewardManager.at(address)
}

async function mintHeroes(quantity) {
  const mintHeroResponse = await heroNFTInstance.mintHeroes(accountsMap.user1, initClass, HERO_PRICE, quantity)
  const heroIds = []
  for (let i = 0; i <  mintHeroResponse.receipt.logs.length; i++) {
    heroIds.push(mintHeroResponse.receipt.logs[i].args.tokenId)
  }
  return heroIds
}

async function mintItem() {
  const response = await itemNFTInstance.mintItem(accountsMap.user1, AETHER_GENE, AETHER_CLASS, ITEM_PRICE, 0)
  return response.receipt.logs[0].args.tokenId
}

async function makeOrder(heroIds, validateEvent = false) {
  const makeOrderResponse = await marketPlaceV2Instance.makeOrder(heroIds, 1, 86400, accountsMap.validAccount1Option)
  if (validateEvent) {
    listenEvent(makeOrderResponse, 'OrderCreated')
  }
  console.log('gas used', makeOrderResponse.receipt.gasUsed)
  return makeOrderResponse.receipt.logs[0].args.id
}

async function summonHero() {
  const { signature, timestamp } = await genSignature(accountsMap.user1, initClass)
  const aetherId = await mintItem()
  await itemNFTInstance.setApprovalForAll(marketPlaceV2Instance.address, true, accountsMap.validAccount1Option)
  const response = await marketPlaceV2Instance.summonHero(initClass, aetherId, signature, timestamp, accountsMap.validAccount1Option)
  listenEvent(response, 'HeroSummoned')
  return getTokenIdFromResponse(response)
}

async function summonPrestigeHero() {
  const { signature, timestamp } = await genSignature(accountsMap.user1, initClass)
  const aetherId = await mintItem()
  await itemNFTInstance.setApprovalForAll(marketPlaceV2Instance.address, true, accountsMap.validAccount1Option)
  const response = await marketPlaceV2Instance.summonPrestigeHero(initClass, aetherId, signature, timestamp, accountsMap.validAccount1Option)
  listenEvent(response, 'PrestigeHeroSummoned')
  return getTokenIdFromResponse(response)
}

async function fundFota(user, rewardManagerInstance) {
  const fotaTokenInstance = await loadFotaInstance(rewardManagerInstance)
  await fotaTokenInstance.releaseGameAllocation(user, value1000BN)
  const balance = await fotaTokenInstance.balanceOf(user)
  balance.should.be.a.bignumber.that.equals(value1000String)
  return fotaTokenInstance
}

async function loadFotaInstance(rewardManagerInstance) {
  const fotaAddress = await rewardManagerInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}
