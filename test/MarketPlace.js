const HeroNFT = artifacts.require('./HeroNFT.sol')
const ITemNFT = artifacts.require('./ITemNFT.sol')
const Citizen = artifacts.require('./Citizen.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const EatherTransporter = artifacts.require('./EatherTransporter.sol')
const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const { BN, listenEvent, accountsMap, value1BN, value100BN, value175BN, value1000BN, value1000String, value500BN} = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevert,
  catchRevertWithReason
} = require('./utils/exceptions.js')

let index = 0
let marketPlaceInstance
const typeFOTA = 0
const typeUSD = 1
const typeALL = 2
const TYPE_TRADING = 0
const TYPE_RENTING = 1
const GENE_NORMAL = 0
const CLASS_0 = 1
const CLASS_1 = 2
const CLASS_HERO_1 = 1
const CLASS_ITEM_1 = 101
const QUANTITY1 = 1
const HERO_PRICE = value175BN
const ITEM_PRICE = value1000BN
const KIND_HERO = 0
const KIND_ITEM = 1
const KIND_LAND = 2
const CURRENCY_FOTA = 0
const CURRENCY_BUSD = 1
const CURRENCY_USDT = 2
const DURATION_7DAYS = 7 * 24 * 60 * 60
const DURATION_ERROR = 1
const TYPE_TRADING_ERROR = 2
const TYPE_RENTING_ERROR = 2
const KIND_HERO_ERROR = 3
const FORMULA_GENE = 0
const FORMULA_CLASS = 1


contract('MarketPlace', (accounts) => {
  // describe('I. Admin functions', async () => {
  //   describe('A. Success', async () => {
  //     beforeEach(async () => {
  //       marketPlaceInstance = await contracts.initMarketPlaceInstance(accounts)
  //     })
      // it('Min level', async () => {
      //   const maxValue = 20
      //   await setMinLevel(maxValue)
      // })
      // it('Update fund admin', async () => {
      //   await marketPlaceInstance.updateFundAdmin(accountsMap.user2)
      //   const newFundAdmin = await marketPlaceInstance.fundAdmin()
      //   newFundAdmin.should.equal(accountsMap.user2)
      //   // const fotaTokenInstance = await loadFotaInstance(marketPlaceInstance)
      //   // const adminOldFotaBalance = await fotaTokenInstance.balanceOf(newFundAdmin)
      //   // await register(accountsMap.user1)
      //   // await buyAHeroWithFota(accountsMap.user1)
      //   // const adminNewFotaBalance = await fotaTokenInstance.balanceOf(newFundAdmin)
      //   // adminNewFotaBalance.should.be.a.bignumber.that.equals(adminOldFotaBalance.add(HERO_PRICE.mul(new BN('95')).div(new BN('100'))))
      // })
      // it('Update payment type', async () => {
      //   await setPaymentType(typeFOTA)
      //   await setPaymentType(typeUSD)
      //   await setPaymentType(typeALL)
      // })
      // it('listHeroes for trading', async () => {
      //   const response = await listHeroes()
      //   listenEvent(response, 'RemainingSaleUpdated', 0)
      // })
      // it('listItems for trading', async () => {
      //   const response = await listItems()
      //   listenEvent(response, 'RemainingSaleUpdated', 0)
      // })
      // it('Admin cancel trading order', async () => {
      //   const tokenId = await userListAHero()
      //   const cancelResponse = await marketPlaceInstance.adminCancelOrder(KIND_HERO, tokenId)
      //   listenEvent(cancelResponse, 'OrderCanceledByAdmin')
      // })
      // it('Admin cancel renting order', async () => {
      //   const tokenId = await userListAHero(TYPE_RENTING)
      //   const cancelResponse = await marketPlaceInstance.adminCancelOrder(KIND_HERO, tokenId)
      //   listenEvent(cancelResponse, 'OrderCanceledByAdmin')
      // })
      // it('Admin can update hero price', async () => {
      //   const currentPrice = await marketPlaceInstance.heroPrices(CLASS_0)
      //   const newPrice = currentPrice.add(new BN('2'))
      //   await marketPlaceInstance.updateHeroPrice(CLASS_0, newPrice)
      //   const newPriceValue = await marketPlaceInstance.heroPrices(CLASS_0)
      //   newPriceValue.should.be.a.bignumber.that.equals(newPrice)
      // })
      // it('Admin can update item price', async () => {
      //   const currentPrice = await marketPlaceInstance.itemPrices(CLASS_0)
      //   const newPrice = currentPrice.add(new BN('2'))
      //   await marketPlaceInstance.updateItemPrice(CLASS_0, newPrice)
      //   const newPriceValue = await marketPlaceInstance.itemPrices(CLASS_0)
      //   newPriceValue.should.be.a.bignumber.that.equals(newPrice)
      // })
      // it('Admin can update user lock status', async () => {
      //   await marketPlaceInstance.updateLockUserStatus(accountsMap.user2, true)
      //   const status = await marketPlaceInstance.lockedUser(accountsMap.user2)
      //   status.should.be.true
      // })
      // it('Admin can update hero lock status', async () => {
      //   for (let i = 1; i <= 18; i++) {
      //     await marketPlaceInstance.updateLockHeroStatus(i, true)
      //     const status = await marketPlaceInstance.lockedHeroClassId(i)
      //     status.should.be.true
      //   }
      // })
      // it('Admin can update item lock status', async () => {
      //   for (let i = 100; i <= 120; i++) {
      //     await marketPlaceInstance.updateLockItemStatus(i, true)
      //     const status = await marketPlaceInstance.lockedItemClassId(i)
      //     status.should.be.true
      //   }
      // })
    // })
    // describe('B. Fail', async () => {
    //   before(async () => {
    //     marketPlaceInstance = await contracts.initMarketPlaceInstance(accounts)
    //   })
    //   it('Min level: unauthorized', async () => {
    //     const maxValue = 25
    //     await catchRevertWithReason(marketPlaceInstance.setMinLevel(maxValue, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('Min level: wrong value', async () => {
    //     const maxValue = 25
    //     await catchRevert(marketPlaceInstance.setMinLevel(maxValue + 1), ' invalid level')
    //   })
    //   it('Update payment method: unauthorized', async () => {
    //     const typeFOTA = 0
    //     await catchRevertWithReason(marketPlaceInstance.updatePaymentType(typeFOTA, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('Update payment method: wrong value', async () => {
    //     const typeError = 3
    //     await catchRevert(marketPlaceInstance.updatePaymentType(typeError))
    //   })
    //   it('listHeroes for trading: unauthorized', async () => {
    //     await grantHeroMintingRight(KIND_HERO)
    //     await catchRevertWithReason(marketPlaceInstance.setRemainingSale(KIND_HERO, CLASS_HERO_1, QUANTITY1, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('listHeroes for trading: wrong value', async () => {
    //     await grantHeroMintingRight(KIND_HERO)
    //     await catchRevertWithReason(marketPlaceInstance.setRemainingSale(KIND_HERO, 19, QUANTITY1), 'classId invalid')
    //   })
    //   it('listItems for trading: unauthorized', async () => {
    //     await grantItemMintingRight(KIND_HERO)
    //     await catchRevertWithReason(marketPlaceInstance.setRemainingSale(KIND_ITEM, CLASS_ITEM_1, QUANTITY1, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('Admin cancel trading order: unauthorized', async () => {
    //     const tokenId = await userListAHero()
    //     await catchRevertWithReason(marketPlaceInstance.adminCancelOrder(KIND_HERO, tokenId, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('Admin cancel trading order: wrong value', async () => {
    //     const tokenId = await userListAHero()
    //     await catchRevert(marketPlaceInstance.adminCancelOrder(KIND_HERO_ERROR, tokenId))
    //     await catchRevert(marketPlaceInstance.adminCancelOrder(KIND_HERO, tokenId.toNumber() + 2), ' no active order found')
    //   })
    //   it('Admin cancel renting order: unauthorized', async () => {
    //     const tokenId = await userListAHero(TYPE_RENTING)
    //     await catchRevertWithReason(marketPlaceInstance.adminCancelOrder(KIND_HERO, tokenId, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('Admin cancel renting order: wrong value', async () => {
    //     const tokenId = await userListAHero(TYPE_RENTING)
    //     await catchRevert(marketPlaceInstance.adminCancelOrder(KIND_HERO_ERROR, tokenId))
    //     await catchRevert(marketPlaceInstance.adminCancelOrder(KIND_HERO, tokenId.toNumber() + 2), ' no active order found')
    //   })
    //   it('Update hero price: unauthorized', async () => {
    //     await catchRevertWithReason(marketPlaceInstance.updateHeroPrice(CLASS_0, HERO_PRICE, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
    //   it('Update item price: unauthorized', async () => {
    //     await catchRevertWithReason(marketPlaceInstance.updateItemPrice(CLASS_0, ITEM_PRICE, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
    //   })
	  // })
  // })
  describe('II. User functions', async () => {
    beforeEach(async () => {
      marketPlaceInstance = await contracts.initMarketPlaceInstance(accounts)
      await register(accountsMap.user1)
    })
    describe('A. Success', async () => {
      // it('Buy a hero from market owner with FOTA', async () => {
      //   await buyAHeroWithFota(accountsMap.user1)
      // })
      // it('Buy a hero with USD', async () => {
      //   await fundUsd(accountsMap.user1, marketPlaceInstance)
      //   await listHeroes(2)
      //   const typeUSD = 1
      //   await marketPlaceInstance.updatePaymentType(typeUSD)
      //   // BUSD
      //   const mbusdTokenInstance = await loadBusdInstance(marketPlaceInstance)
      //   await mbusdTokenInstance.approve(marketPlaceInstance.address, HERO_PRICE, accountsMap.validAccount1Option)
      //   const allowance = await mbusdTokenInstance.allowance(accountsMap.user1, marketPlaceInstance.address)
      //   allowance.should.be.a.bignumber.that.equals(HERO_PRICE)
      //   const heroNFTInstance = await loadHeroInstance()
      //   const busdResponse = await marketPlaceInstance.takeFounding(KIND_HERO, CLASS_HERO_1, CURRENCY_BUSD, accountsMap.validAccount1Option)
      //   listenEvent(busdResponse, 'FoundingOrderTaken', 1)
      //   const tokenId = getTokenIdFromResponse(busdResponse, 1)
      //   const owner = await heroNFTInstance.ownerOf(tokenId)
      //   owner.should.be.equal(accountsMap.user1)
      //   const hero = await heroNFTInstance.getHeroPrices(tokenId)
      //   hero['0'].should.be.a.bignumber.that.equal(HERO_PRICE)
      //
      //   // USDT
      //   const musdtTokenInstance = await loadUsdtInstance(marketPlaceInstance)
      //   await musdtTokenInstance.approve(marketPlaceInstance.address, HERO_PRICE, accountsMap.validAccount1Option)
      //   const allowance2 = await musdtTokenInstance.allowance(accountsMap.user1, marketPlaceInstance.address)
      //   allowance2.should.be.a.bignumber.that.equals(HERO_PRICE)
      //   const usdtResponse = await marketPlaceInstance.takeFounding(KIND_HERO, CLASS_HERO_1, CURRENCY_USDT, accountsMap.validAccount1Option)
      //   const tokenId1 = getTokenIdFromResponse(usdtResponse, 1)
      //   listenEvent(usdtResponse, 'FoundingOrderTaken', 1)
      //   const owner2 = await heroNFTInstance.ownerOf(tokenId1)
      //   owner2.should.be.equal(accountsMap.user1)
      // })
      // it('List a hero for trading', async () => {
      //   await userListAHero()
	    // })
      // it('List a hero for renting', async () => {
      //   await userListAHero(TYPE_RENTING)
	    // })
      // it('List an item for trading', async () => {
      //   await userListAnItem()
	    // })
      // it('List a eather for trading', async () => {
      //   const eatherTransporterInstance = await loadEatherTransporterInstance()
      //   await eatherTransporterInstance.updateOpenEather(true)
      //   const itemNFTInstance = await loadItemInstance()
      //   await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
      //   const user = accountsMap.user1
      //   const eatherMintingResponse = await itemNFTInstance.mintItem(user, FORMULA_GENE, FORMULA_CLASS, ITEM_PRICE, 0)
      //   const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      //   await itemNFTInstance.approve(marketPlaceInstance.address, eatherTokenId, accountsMap.validAccount1Option)
      //   await itemNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
      //   await setMinLevel(2)
      //   const listHeroResponse = await marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_ITEM, eatherTokenId, ITEM_PRICE, ITEM_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
      //   listenEvent(listHeroResponse, 'OrderCreated')
      // })
      // it('List an item for renting', async () => {
      //   await userListAnItem(TYPE_RENTING)
	    // })
      // it('Buy a hero with fota', async () => {
      //   const tokenId = await userListAHero()
      //   await setPaymentType(typeFOTA)
      //   await fundFota(accountsMap.user2)
      //   await register(accountsMap.user2, 'USER2')
      //   await approveFota(accountsMap.user2)
      //   await buyAHero(accountsMap.user2, tokenId, CURRENCY_FOTA)
	    // })
      // it('Can buy a hero with busd', async () => {
      //   const tokenId = await userListAHero()
      //   await setPaymentType(typeUSD)
      //   await fundUsd(accountsMap.user2)
      //   await register(accountsMap.user2, 'USER2')
      //   await approveBusd(accountsMap.user2)
      //   await buyAHero(accountsMap.user2, tokenId, CURRENCY_BUSD)
	    // })
      // it('Can buy a hero with usdt', async () => {
      //   const tokenId = await userListAHero()
      //   await setPaymentType(typeUSD)
      //   await fundUsd(accountsMap.user2)
      //   await register(accountsMap.user2, 'USER2')
      //   await approveUsdt(accountsMap.user2)
      //   await buyAHero(accountsMap.user2, tokenId, CURRENCY_USDT)
	    // })
      // it('Can rent a hero with fota', async () => {
      //   const tokenId = await userListAHero(TYPE_RENTING)
      //   await setPaymentType(typeFOTA)
      //   await fundFota(accountsMap.user2)
      //   await register(accountsMap.user2, 'USER2')
      //   await approveFota(accountsMap.user2)
      //   await rentAHero(accountsMap.user2, tokenId, CURRENCY_FOTA)
      // })
      it('Can rent a hero with busd', async () => {
        const tokenId = await userListAHero(TYPE_RENTING)
        await setPaymentType(typeUSD)
        await fundUsd(accountsMap.user2)
        await register(accountsMap.user2, 'USER2')
        await approveBusd(accountsMap.user2)
        await rentAHero(accountsMap.user2, tokenId, CURRENCY_BUSD)
      })
      // it('Can rent a hero with usdt', async () => {
      //   const tokenId = await userListAHero(TYPE_RENTING)
      //   await setPaymentType(typeUSD)
      //   await fundUsd(accountsMap.user2)
      //   await register(accountsMap.user2, 'USER2')
      //   await approveUsdt(accountsMap.user2)
      //   await rentAHero(accountsMap.user2, tokenId, CURRENCY_USDT)
      // })
      // it('Cancel trading hero order', async () => {
      //   const tokenId = await userListAHero()
      //   const response = await marketPlaceInstance.cancelOrder(KIND_HERO, tokenId, accountsMap.validAccount1Option)
      //   listenEvent(response, 'OrderCanceled')
      //   const heroNFTInstance = await loadHeroInstance()
      //   const owner = await heroNFTInstance.ownerOf(tokenId)
      //   owner.should.be.equal(accountsMap.user1)
      // })
      // it('Cancel renting hero order', async () => {
      //   const tokenId = await userListAHero(TYPE_RENTING)
      //   const response = await marketPlaceInstance.cancelOrder(KIND_HERO, tokenId, accountsMap.validAccount1Option)
      //   listenEvent(response, 'OrderCanceled')
      //   const heroNFTInstance = await loadHeroInstance()
      //   const owner = await heroNFTInstance.ownerOf(tokenId)
      //   owner.should.be.equal(accountsMap.user1)
      // })
      // it('Cancel trading item order', async () => {
      //   const tokenId = await userListAnItem()
      //   const response = await marketPlaceInstance.cancelOrder(KIND_ITEM, tokenId, accountsMap.validAccount1Option)
      //   listenEvent(response, 'OrderCanceled')
      //   const itemNFTInstance = await loadItemInstance()
      //   const owner = await itemNFTInstance.ownerOf(tokenId)
      //   owner.should.be.equal(accountsMap.user1)
      // })
      // it('Cancel renting item order', async () => {
      //   const tokenId = await userListAnItem(TYPE_RENTING)
      //   const response = await marketPlaceInstance.cancelOrder(KIND_ITEM, tokenId, accountsMap.validAccount1Option)
      //   listenEvent(response, 'OrderCanceled')
      //   const itemNFTInstance = await loadItemInstance()
      //   const owner = await itemNFTInstance.ownerOf(tokenId)
      //   owner.should.be.equal(accountsMap.user1)
      // })
    })
    // describe('B. Fail', async () => {
    //   beforeEach(async () => {
    //     await setMinLevel(0)
    //   })
    //   it('sold out', async () => {
    //     await marketPlaceInstance.setRemainingSale(KIND_HERO, CLASS_HERO_1, 0)
    //     await catchRevertWithReason(marketPlaceInstance.takeFounding(KIND_HERO, CLASS_HERO_1, CURRENCY_BUSD, accountsMap.validAccount1Option), 'sold out')
    //   })
    //   it('Not a user', async () => {
    //     const userOption = {
    //       from: accountsMap.user1
    //     }
    //     const {
    //       tokenId
    //     } = await mintAHero(accountsMap.user1)
    //     await marketPlaceInstance.updatePaymentType(typeFOTA)
    //     await catchRevert(marketPlaceInstance.takeOrder(KIND_HERO, tokenId, CURRENCY_FOTA, userOption))
    //   })
    //   it('List a hero for trading: have no NFT', async () => {
    //     const {
    //       tokenId
    //     } = await mintAHero(accountsMap.user1)
    //     await catchRevert(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.accountUnauthorizedOption))
    //   })
    //   it('Hero level invalid', async () => {
    //     await setMinLevel(1)
    //     const {
    //       tokenId,
    //       heroNFTInstance
    //     } = await mintAHero(accountsMap.user1)
    //     await heroNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
    //     await catchRevertWithReason(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option), ' level invalid')
    //   })
    //   it('Item level invalid: too low', async () => {
    //     await setMinGene(2)
    //     const {
    //       tokenId,
    //       itemNFTInstance
    //     } = await mintAnItem(accountsMap.user1, CLASS_ITEM_1)
    //     await itemNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
    //     await catchRevertWithReason(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_ITEM, tokenId, ITEM_PRICE, ITEM_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option), ' item invalid')
    //   })
    //   describe('Wrong values', async () => {
    //     let tokenId
    //     beforeEach(async () => {
    //       const data = await mintAHero(accountsMap.user1)
    //       tokenId = data.tokenId
    //       await data.heroNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
    //     })
    //     it('List a hero for trading: wrong type', async () => {
    //       await catchRevert(marketPlaceInstance.makeOrder(TYPE_TRADING_ERROR, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option))
    //     })
    //     it('List a hero for trading: wrong kind', async () => {
    //       await catchRevert(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO_ERROR, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option))
    //     })
    //     it('List a hero for trading: wrong duration', async () => {
    //       await catchRevertWithReason(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, value1000BN, DURATION_ERROR, DURATION_ERROR, accountsMap.validAccount1Option), ' duration is invalid')
    //     })
    //   })
    //   it('Take hero order when token get locked', async () => {
    //     const user = accountsMap.user1
    //     await fundFota(user)
    //     const typeFOTA = 0
    //     await marketPlaceInstance.updatePaymentType(typeFOTA)
    //     const heroTokenId = await userListAHero()
    //     await approveFota(user)
    //     const userOption = {
    //       from: user
    //     }
    //     await marketPlaceInstance.updateLockHeroNFTIdStatus(heroTokenId, true)
    //     await catchRevertWithReason(marketPlaceInstance.takeOrder(KIND_HERO, heroTokenId, CURRENCY_FOTA, userOption), 'hero locked')
    //
    //     const itemTokenId = await userListAnItem()
    //     await marketPlaceInstance.updateLockItemNFTIdStatus(itemTokenId, true)
    //     await catchRevertWithReason(marketPlaceInstance.takeOrder(KIND_ITEM, itemTokenId, CURRENCY_FOTA, userOption), 'item locked')
    //   })
    //   it('List hero when user get locked', async () => {
    //     const {
    //       tokenId,
    //       heroNFTInstance
    //     } = await mintAHero(accountsMap.user1)
    //     await marketPlaceInstance.updateLockUserStatus(accountsMap.user1, true)
    //     await heroNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
    //     await setMinLevel(0)
    //     await catchRevertWithReason(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option), 'user locked')
    //
    //     await marketPlaceInstance.updateLockUserStatus(accountsMap.user1, false)
    //     const listHeroResponse = await marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
    //     listenEvent(listHeroResponse, 'OrderCreated')
    //   })
    //   it('List hero when hero get locked', async () => {
    //     const {
    //       tokenId,
    //       heroNFTInstance
    //     } = await mintAHero(accountsMap.user1)
    //     await marketPlaceInstance.updateLockHeroStatus(CLASS_0, true)
    //     await heroNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
    //     await setMinLevel(0)
    //     await catchRevertWithReason(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option), ' hero invalid')
    //
    //     await marketPlaceInstance.updateLockHeroStatus(CLASS_0, false)
    //     const listHeroResponse = await marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
    //     listenEvent(listHeroResponse, 'OrderCreated')
    //   })
    //   it('List item when item get locked', async () => {
    //     const {
    //       tokenId,
    //       itemNFTInstance
    //     } = await mintAnItem(accountsMap.user1, CLASS_ITEM_1)
    //     await marketPlaceInstance.updateLockItemStatus(CLASS_ITEM_1, true)
    //     await itemNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
    //     await setMinLevel(0)
    //     await setMinGene(0)
    //     await catchRevertWithReason(marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_ITEM, tokenId, ITEM_PRICE, ITEM_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option), ' item invalid')
    //
    //     await marketPlaceInstance.updateLockItemStatus(CLASS_ITEM_1, false)
    //     const listItemResponse = await marketPlaceInstance.makeOrder(TYPE_TRADING, KIND_ITEM, tokenId, ITEM_PRICE, ITEM_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
    //     listenEvent(listItemResponse, 'OrderCreated')
    //   })
	  // })
  })
})

async function listHeroes(quantity = QUANTITY1) {
  await grantHeroMintingRight(KIND_HERO)
  await marketPlaceInstance.updateHeroPrice(CLASS_HERO_1, HERO_PRICE)
  return marketPlaceInstance.setRemainingSale(KIND_HERO, CLASS_HERO_1, quantity)
}

async function listItems(quantity = QUANTITY1) {
  await grantItemMintingRight(KIND_ITEM)
  return marketPlaceInstance.setRemainingSale(KIND_ITEM, CLASS_ITEM_1, quantity)
}

async function grantHeroMintingRight() {
  const heroNFTInstance = await loadHeroInstance()
  await heroNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
}

async function grantItemMintingRight() {
  const itemNFTInstance = await loadItemInstance()
  await itemNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
}

async function loadHeroInstance() {
  const heroAddress = await marketPlaceInstance.nftTokens(KIND_HERO)
  return HeroNFT.at(heroAddress)
}

async function loadItemInstance() {
  const itemAddress = await marketPlaceInstance.nftTokens(KIND_ITEM)
  return ITemNFT.at(itemAddress)
}

async function loadEatherTransporterInstance() {
  const eatherTransporterAddress = await marketPlaceInstance.eatherTransporter()
  return EatherTransporter.at(eatherTransporterAddress)
}

async function loadFotaInstance() {
  const fotaAddress = await marketPlaceInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function loadCitizenInstance() {
  const citizenAddress = await marketPlaceInstance.citizen()
  return Citizen.at(citizenAddress)
}

async function loadBusdInstance() {
  const busdAddress = await marketPlaceInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await marketPlaceInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
}

async function fundFota(user) {
  const fotaTokenInstanceInstance = await loadFotaInstance(marketPlaceInstance)
  await fotaTokenInstanceInstance.releaseGameAllocation(user, value1000BN)
  const balance = await fotaTokenInstanceInstance.balanceOf(user)
  balance.should.be.a.bignumber.that.equals(value1000String)
}

async function fundUsd(user, marketPlaceInstance) {
  const mbusdTokenInstance = await loadBusdInstance(marketPlaceInstance)
  const musdtTokenInstance = await loadUsdtInstance(marketPlaceInstance)
  await mbusdTokenInstance.transfer(user, value1000BN)
  await musdtTokenInstance.transfer(user, value1000BN)
  const busdBalance = await mbusdTokenInstance.balanceOf(user)
  busdBalance.should.be.a.bignumber.that.equals(value1000String)
  const usdtBalance = await musdtTokenInstance.balanceOf(user)
  usdtBalance.should.be.a.bignumber.that.equals(value1000String)
}

async function register(user, userName = 'USERNAME') {
  const citizenInstance = await loadCitizenInstance(marketPlaceInstance)
  await citizenInstance.register(user, userName, accountsMap.zeroAddress, accountsMap.validAccount1Option)
}

async function buyAHeroWithFota(user) {
  await fundFota(user)
  await listHeroes()
  const typeFOTA = 0
  await marketPlaceInstance.updatePaymentType(typeFOTA)
  await approveFota(user)
  await buyAFoundingHero(user, CURRENCY_FOTA)
}

async function approveFota(user) {
  const userOption = {
    from: user
  }
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.approve(marketPlaceInstance.address, HERO_PRICE, userOption)
  const allowance = await fotaTokenInstance.allowance(user, marketPlaceInstance.address)
  allowance.should.be.a.bignumber.that.equals(HERO_PRICE)
}

async function approveBusd(user) {
  const userOption = {
    from: user
  }
  const busdTokenInstance = await loadBusdInstance()
  await busdTokenInstance.approve(marketPlaceInstance.address, HERO_PRICE, userOption)
  const allowance = await busdTokenInstance.allowance(user, marketPlaceInstance.address)
  allowance.should.be.a.bignumber.that.equals(HERO_PRICE)
}

async function approveUsdt(user) {
  const userOption = {
    from: user
  }
  const usdtTokenInstance = await loadUsdtInstance()
  await usdtTokenInstance.approve(marketPlaceInstance.address, HERO_PRICE, userOption)
  const allowance = await usdtTokenInstance.allowance(user, marketPlaceInstance.address)
  allowance.should.be.a.bignumber.that.equals(HERO_PRICE)
}

async function buyAHero(user, tokenId, currency) {
  const userOption = {
    from: user
  }
  const response = await marketPlaceInstance.takeOrder(KIND_HERO, tokenId, currency, userOption)
  listenEvent(response, 'OrderTaken', 1)
  const heroNFTInstance = await loadHeroInstance()
  const owner = await heroNFTInstance.ownerOf(tokenId)
  owner.should.be.equal(user)
}

async function buyAFoundingHero(user, currency) {
  const userOption = {
    from: user
  }
  const remainingSaleOld = await marketPlaceInstance.remainingSale(KIND_HERO, CLASS_HERO_1)
  const response = await marketPlaceInstance.takeFounding(KIND_HERO, CLASS_HERO_1, currency, userOption)
  const remainingSaleNew = await marketPlaceInstance.remainingSale(KIND_HERO, CLASS_HERO_1)
  remainingSaleNew.toNumber().should.be.equal(remainingSaleOld.toNumber() - 1)
  listenEvent(response, 'ReferralSent')
  listenEvent(response, 'FoundingOrderTaken', 1)
  const tokenId = getTokenIdFromResponse(response, 1)
  const heroNFTInstance = await loadHeroInstance()
  const owner = await heroNFTInstance.ownerOf(tokenId)
  owner.should.be.equal(user)
}

async function rentAHero(user, tokenId, currency) {
  const userOption = {
    from: user
  }
  const response = await marketPlaceInstance.takeOrder(KIND_HERO, tokenId, currency, userOption)
  listenEvent(response, 'OrderTaken', 1)
  const heroNFTInstance = await loadHeroInstance()
  const owner = await heroNFTInstance.ownerOf(tokenId)
  owner.should.be.equal(marketPlaceInstance.address)
}

async function userListAHero(type = TYPE_TRADING) {
  const {
    tokenId,
    heroNFTInstance
  } = await mintAHero(accountsMap.user1)
  await heroNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
  await setMinLevel(0)
  const listHeroResponse = await marketPlaceInstance.makeOrder(type, KIND_HERO, tokenId, HERO_PRICE, HERO_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
  listenEvent(listHeroResponse, 'OrderCreated')
  return tokenId
}

async function userListAnItem(type = TYPE_TRADING) {
  const {
    tokenId,
    itemNFTInstance
  } = await mintAnItem(accountsMap.user1, CLASS_ITEM_1)
  await marketPlaceInstance.setMinGene(0)
  await itemNFTInstance.approve(marketPlaceInstance.address, tokenId, accountsMap.validAccount1Option)
  await setMinLevel(0)
  const listHeroResponse = await marketPlaceInstance.makeOrder(type, KIND_ITEM, tokenId, ITEM_PRICE, ITEM_PRICE, DURATION_7DAYS, DURATION_7DAYS, accountsMap.validAccount1Option)
  listenEvent(listHeroResponse, 'OrderCreated')
  return tokenId
}

async function mintAHero(user) {
  const heroNFTInstance = await loadHeroInstance()
  await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
  await heroNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
  const response = await heroNFTInstance.mintHero(user, CLASS_0, HERO_PRICE, ++index)
  const tokenId = await getTokenIdFromResponse(response)
  return {
    tokenId,
    heroNFTInstance
  }
}

async function mintAnItem(user, itemClass) {
  const itemNFTInstance = await loadItemInstance()
  await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
  await itemNFTInstance.updateMintAdmin(marketPlaceInstance.address, true)
  const response = await itemNFTInstance.mintItem(user, GENE_NORMAL, itemClass, ITEM_PRICE, ++index)
  const tokenId = await getTokenIdFromResponse(response)
  return {
    tokenId,
    itemNFTInstance
  }
}

function getTokenIdFromResponse(response, index = 0) {
  return response.receipt.logs[index].args.tokenId
}

async function setMinLevel(minLevel) {
  await marketPlaceInstance.setMinLevel(minLevel)
  const newMinLevel = await marketPlaceInstance.minLevel()
  newMinLevel.toNumber().should.equal(minLevel)
}

async function setMinGene(minGene) {
  await marketPlaceInstance.setMinGene(minGene)
  const newMinGene = await marketPlaceInstance.minGene()
  newMinGene.toNumber().should.equal(minGene)
}

async function setPaymentType(paymentType) {
  await marketPlaceInstance.updatePaymentType(paymentType)
  let newPaymentMethod = await marketPlaceInstance.paymentType()
  newPaymentMethod.toNumber().should.be.equal(paymentType)
}
