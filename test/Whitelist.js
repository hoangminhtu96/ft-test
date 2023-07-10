const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const { BN, listenEvent, accountsMap, value1BN, value500BN, value500String} = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevertWithReason, catchRevert
} = require('./utils/exceptions.js')
const { WHITELIST_PRICE } = require('./utils/dataHolder')
let whiteListInstance
const CURRENCY_BUSD = 0
const CURRENCY_USDT = 1

contract('Whitelist', (accounts) => {
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        whiteListInstance = await contracts.initWhitelistInstance(accounts)
      })
      it('Update total slot', async () => {
        const oldTotalSlots = await whiteListInstance.totalSlots()
        const response = await whiteListInstance.updateTotalSlot(oldTotalSlots.toNumber() + 1)
        listenEvent(response, 'TotalSlotUpdated')
        const newTotalSlots = await whiteListInstance.totalSlots()
        newTotalSlots.toNumber().should.be.equal(oldTotalSlots.toNumber() + 1)
      })
      it('Update price', async () => {
        const oldPrice = await whiteListInstance.price()
        await whiteListInstance.updatePrice(oldPrice.add(value1BN))
        const newPrice = await whiteListInstance.price()
        newPrice.should.be.a.bignumber.that.equal(oldPrice.add(value1BN))
      })
      it('update fund admin', async () => {
        await whiteListInstance.updateFundAdmin(accountsMap.user1)
        const mbusdTokenInstance = await loadBusdInstance()
        const balanceBUSDBefore = await mbusdTokenInstance.balanceOf(accountsMap.user1)
        await reserve(accountsMap.user10, CURRENCY_BUSD)
        const balanceBUSDAfter = await mbusdTokenInstance.balanceOf(accountsMap.user1)
        balanceBUSDAfter.should.be.a.bignumber.that.equal(balanceBUSDBefore.add(WHITELIST_PRICE))

        const musdtTokenInstance = await loadUsdtInstance()
        const balanceUSDTBefore = await musdtTokenInstance.balanceOf(accountsMap.user1)
        await reserve(accountsMap.user11, CURRENCY_USDT)
        const balanceUSDTAfter = await musdtTokenInstance.balanceOf(accountsMap.user1)
        balanceUSDTAfter.should.be.a.bignumber.that.equal(balanceUSDTBefore.add(WHITELIST_PRICE))
      })
    })
    describe('B. Failed', async () => {
      before(async () => {
        whiteListInstance = await contracts.initWhitelistInstance(accounts)
      })
      it('Update total slot: unauthorized', async () => {
        await catchRevertWithReason(whiteListInstance.updateTotalSlot(1, accountsMap.accountUnauthorizedOption), "onlyMainAdmin")
      })
      it('Update total slot: invalid value', async () => {
        await reserve(accountsMap.user10, CURRENCY_USDT)
        await reserve(accountsMap.user11, CURRENCY_USDT)
        await catchRevertWithReason(whiteListInstance.updateTotalSlot(1), "Whitelist: invalid total slot")
      })
      it('Update price: unauthorized', async () => {
        await catchRevertWithReason(whiteListInstance.updatePrice(1, accountsMap.accountUnauthorizedOption), "onlyMainAdmin")
      })
      it('Update price: invalid time', async () => {
        await catchRevertWithReason(whiteListInstance.updatePrice(0), "Whitelist: invalid price")
        await reserve(accountsMap.user12, CURRENCY_USDT)
        await catchRevertWithReason(whiteListInstance.updatePrice(1), "Whitelist: invalid price")
      })
      it('Update fund admin: unauthorized', async () => {
        await catchRevertWithReason(whiteListInstance.updateFundAdmin(accountsMap.user1, accountsMap.accountUnauthorizedOption), "onlyMainAdmin")
      })
    })
  })
  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        whiteListInstance = await contracts.initWhitelistInstance(accounts)
      })
      it('reserve', async () => {
        await reserve(accountsMap.user1, CURRENCY_BUSD)
        await reserve(accountsMap.user2, CURRENCY_USDT)
      })
    })
    describe('B. Fail', async () => {
      beforeEach(async () => {
        whiteListInstance = await contracts.initWhitelistInstance(accounts)
      })
      it('reserve', async () => {
        await reserve(accountsMap.user1, CURRENCY_BUSD)
        await reserve(accountsMap.user2, CURRENCY_USDT)
      })
      it('reserve: when already whitelisted', async () => {
        await whiteListInstance.updateTotalSlot(1)
        await reserve(accountsMap.user1, CURRENCY_BUSD)
        await catchRevertWithReason(whiteListInstance.reserve(CURRENCY_BUSD, accountsMap.validAccount1Option), "Whitelist: already whiteListed")
      })
      it('reserve: when fully whitelisted', async () => {
        await whiteListInstance.updateTotalSlot(1)
        await reserve(accountsMap.user1, CURRENCY_BUSD)
        await catchRevertWithReason(reserve(accountsMap.user2, CURRENCY_USDT), "Whitelist: fully whiteListed")
      })
    })
  })
})

async function reserve(user, paymentCurrency) {
  const userOption = {
    from: user
  }
  await fundUsd(user)
  const mbusdTokenInstance = await loadBusdInstance()
  const musdtTokenInstance = await loadUsdtInstance()
  await mbusdTokenInstance.approve(whiteListInstance.address, value500BN, userOption)
  await musdtTokenInstance.approve(whiteListInstance.address, value500BN, userOption)
  const response = await whiteListInstance.reserve(paymentCurrency, userOption)
  const inWhiteList = await whiteListInstance.whiteList(user)
  inWhiteList.should.be.true
  listenEvent(response, 'SlotReserved')
}

async function fundUsd(user) {
  const mbusdTokenInstance = await loadBusdInstance()
  const musdtTokenInstance = await loadUsdtInstance()
  await mbusdTokenInstance.transfer(user, value500BN)
  await musdtTokenInstance.transfer(user, value500BN)
  const busdBalance = await mbusdTokenInstance.balanceOf(user)
  busdBalance.should.be.a.bignumber.that.equals(value500String)
  const usdtBalance = await musdtTokenInstance.balanceOf(user)
  usdtBalance.should.be.a.bignumber.that.equals(value500String)
}

async function loadBusdInstance() {
  const busdAddress = await whiteListInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await whiteListInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
}
