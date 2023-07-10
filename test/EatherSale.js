const Citizen = artifacts.require('./Citizen.sol')
const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const ItemNFT = artifacts.require('./ItemNFT.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const FOTAPricer = artifacts.require('./FOTAPricer.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const MarketPlace = artifacts.require('./MarketPlace.sol')
const { BN, listenEvent, accountsMap, value420MBN, value500BN, value1000BN, value5000BN, value1000String} = require('./utils')
const contracts = require('./utils/contracts')
const {
catchRevertWithReason, catchRevert
} = require('./utils/exceptions.js')
const { ITEM_PRICE } = require('./utils/dataHolder')

const typeFOTA = 0
const typeUSD = 1
const typeALL = 2
const quantity = 10
const CURRENCY_FOTA = 0
const CURRENCY_BUSD = 1
const CURRENCY_USDT = 2
let eatherSaleInstance
let itemNFTInstance
let mbusdTokenInstance

contract('EatherSale', (accounts) => {
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        eatherSaleInstance = await contracts.initEatherSaleInstance(accounts)
      })
      it('Update payment type', async () => {
        const response = await eatherSaleInstance.updatePaymentType(typeFOTA)
        listenEvent(response, 'PaymentTypeChanged')
        let paymentType = await eatherSaleInstance.paymentType()
        paymentType.toNumber().should.be.equal(typeFOTA)

        await eatherSaleInstance.updatePaymentType(typeUSD)
        paymentType = await eatherSaleInstance.paymentType()
        paymentType.toNumber().should.be.equal(typeUSD)

        await eatherSaleInstance.updatePaymentType(typeALL)
        paymentType = await eatherSaleInstance.paymentType()
        paymentType.toNumber().should.be.equal(typeALL)
      })
      it('Update pool addresses', async () => {
        const pools = [accountsMap.user1, accountsMap.user2]
        await eatherSaleInstance.updatePoolAddress(pools)
        for(let i = 0; i < pools.length; i++) {
          const poolAddress = await eatherSaleInstance.pools(i)
          poolAddress.should.be.equal(pools[i])
        }
      })
      it('Update total sale', async () => {
        const oldTotalSale = await eatherSaleInstance.totalSale()
        const response = await eatherSaleInstance.updateTotalSale(oldTotalSale.toNumber() + 1)
        listenEvent(response, 'TotalSaleUpdated')
        const newTotalSale = await eatherSaleInstance.totalSale()
        newTotalSale.toNumber().should.be.equal(oldTotalSale.toNumber() + 1)
      })
    })
    describe('B. Fail', async () => {
      before(async () => {
        eatherSaleInstance = await contracts.initEatherSaleInstance(accounts)
      })
      it('Update payment method: unauthorized', async () => {
        const typeFOTA = 0
        await catchRevertWithReason(eatherSaleInstance.updatePaymentType(typeFOTA, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Update payment method: wrong value', async () => {
        const typeError = 3
        await catchRevert(eatherSaleInstance.updatePaymentType(typeError))
      })
      it('Update pool address: unauthorized', async () => {
        const typeFOTA = 0
        await catchRevertWithReason(eatherSaleInstance.updatePoolAddress([accountsMap.user1], accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Update pool address: wrong data', async () => {
        const typeFOTA = 0
        await catchRevertWithReason(eatherSaleInstance.updatePoolAddress([]), "EatherSale: empty data")
      })
    })
  })
  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      let pools
      beforeEach(async () => {
        eatherSaleInstance = await contracts.initEatherSaleInstance(accounts)
        itemNFTInstance = await loadNFTInstance()
        await itemNFTInstance.updateMintAdmin(eatherSaleInstance.address, true)
        pools = [accountsMap.user10, accountsMap.user20]
        await eatherSaleInstance.updatePoolAddress(pools)
      })
      it('Buy item with fota', async () => {
        await buyItemWithFota(accountsMap.user1, pools)
      })
      it('Buy item with busd', async () => {
        await buyItemWithBusd(accountsMap.user1, pools)
      })
      it('Buy item with usdt', async () => {
        await buyItemWithUsdt(accountsMap.user1, pools)
      })
    })
    describe('B. Fail', async () => {
      let user
      let userOption
      before(async () => {
        eatherSaleInstance = await contracts.initEatherSaleInstance(accounts)
        itemNFTInstance = await loadNFTInstance()
        await itemNFTInstance.updateMintAdmin(eatherSaleInstance.address, true)
        user = accountsMap.user1
        userOption = {
          from: user
        }
      })
      it('Not a user', async () => {
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_FOTA, userOption), "EatherSale: register required")
      })
      it('Wrong payment method', async () => {
        await register(user)
        await eatherSaleInstance.updatePaymentType(typeFOTA)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_BUSD, userOption), "EatherSale: wrong payment method")
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_USDT, userOption), "EatherSale: wrong payment method")
        await eatherSaleInstance.updatePaymentType(typeUSD)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_FOTA, userOption), "EatherSale: wrong payment method")
      })
      it('Buy with fota: no approve', async () => {
        await eatherSaleInstance.updatePaymentType(typeFOTA)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_FOTA, userOption), "EatherSale: please approve fota first")
	    })
      it('Buy with fota: insufficient balance', async () => {
        await eatherSaleInstance.updatePaymentType(typeFOTA)
        await approveFota(user, value420MBN)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_FOTA, userOption), "EatherSale: insufficient balance")
	    })
      it('Buy with busd: no approve', async () => {
        await eatherSaleInstance.updatePaymentType(typeUSD)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_BUSD, userOption), "EatherSale: please approve usd token first")
	    })
      it('Buy with busd: insufficient balance', async () => {
        await eatherSaleInstance.updatePaymentType(typeUSD)
        await approveBusd(user, value420MBN)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_BUSD, userOption), "EatherSale: insufficient balance")
	    })
      it('Buy with usdt: no approve', async () => {
        await eatherSaleInstance.updatePaymentType(typeUSD)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_USDT, userOption), "EatherSale: please approve usd token first")
	    })
      it('Buy with usdt: insufficient balance', async () => {
        await eatherSaleInstance.updatePaymentType(typeUSD)
        await approveUsdt(user, value420MBN)
        await catchRevertWithReason(eatherSaleInstance.buy(quantity, CURRENCY_USDT, userOption), "EatherSale: insufficient balance")
	    })
      it('Sold out or not enough to buy', async () => {
        const maxQuantityPerOrder = await eatherSaleInstance.maxQuantityPerOrder()
        await catchRevertWithReason(eatherSaleInstance.buy(maxQuantityPerOrder.toNumber() + 1, CURRENCY_FOTA, userOption), "EatherSale: quantity invalid")
      })
    })
  })
})

async function buyItemWithFota(user, pools) {
  const userOption = {
    from: user
  }
  const fotaTokenInstance = await loadFotaInstance()
  const fotaPricerInstance = await loadFotaPricerInstance()

  await fundFota(user)
  await register(user)
  await eatherSaleInstance.updatePaymentType(typeFOTA)
  const itemPrice = await eatherSaleInstance.itemPrice()
  const fotaPrice = await fotaPricerInstance.fotaPrice()
  const paymentAmount = itemPrice.mul(new BN(`${quantity}`)).mul(new BN('1000')).div(fotaPrice)
  await approveFota(user, paymentAmount)
  const balanceBefore = await fotaTokenInstance.balanceOf(user)
  const oldTotalSale = await eatherSaleInstance.totalSale()
  const response = await eatherSaleInstance.buy(quantity, CURRENCY_FOTA, userOption)
  const newTotalSale = await eatherSaleInstance.totalSale()
  newTotalSale.toNumber().should.be.equal(oldTotalSale.toNumber() - quantity)
  listenEvent(response, 'ItemBought')
  await validateResponse(response, user)
  const balanceAfter = await fotaTokenInstance.balanceOf(user)
  balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.sub(paymentAmount))

  const poolShared = paymentAmount.div(new BN(`${pools.length}`))
  for(let i = 0; i < pools.length; i++) {
    const poolBalance = await fotaTokenInstance.balanceOf(pools[i])
    poolBalance.should.be.a.bignumber.that.equals(poolShared)
  }
}

async function buyItemWithBusd(user, pools) {
  const userOption = {
    from: user
  }
  const busdTokenInstance = await loadBusdInstance()
  await fundUsd(user)
  await register(user)
  await eatherSaleInstance.updatePaymentType(typeUSD)
  const itemPrice = await eatherSaleInstance.itemPrice()
  const paymentAmount = itemPrice.mul(new BN(`${quantity}`))
  await approveBusd(user, paymentAmount)
  const balanceBefore = await busdTokenInstance.balanceOf(user)
  const response = await eatherSaleInstance.buy(quantity, CURRENCY_BUSD, userOption)
  listenEvent(response, 'ItemBought')
  await validateResponse(response, user)
  const balanceAfter = await busdTokenInstance.balanceOf(user)
  balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.sub(paymentAmount))

  const poolShared = paymentAmount.div(new BN(`${pools.length}`))
  for(let i = 0; i < pools.length; i++) {
    const poolBalance = await busdTokenInstance.balanceOf(pools[i])
    poolBalance.should.be.a.bignumber.that.equals(poolShared)
  }
}

async function buyItemWithUsdt(user, pools) {
  const userOption = {
    from: user
  }
  const usdTTokenInstance = await loadUsdtInstance()
  await fundUsd(user)
  await register(user)
  await eatherSaleInstance.updatePaymentType(typeUSD)
  const itemPrice = await eatherSaleInstance.itemPrice()
  const paymentAmount = itemPrice.mul(new BN(`${quantity}`))
  await approveUsdt(user, paymentAmount)
  const balanceBefore = await usdTTokenInstance.balanceOf(user)
  const response = await eatherSaleInstance.buy(quantity, CURRENCY_USDT, userOption)
  listenEvent(response, 'ItemBought')
  await validateResponse(response, user)
  const balanceAfter = await usdTTokenInstance.balanceOf(user)
  balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.sub(paymentAmount))

  const poolShared = paymentAmount.div(new BN(`${pools.length}`))
  for(let i = 0; i < pools.length; i++) {
    const poolBalance = await usdTTokenInstance.balanceOf(pools[i])
    poolBalance.should.be.a.bignumber.that.equals(poolShared)
  }
}

async function validateResponse(response, user) {
  const tokenIds = await getTokenIdsFromResponse(response)
  for(let i = 0; i < tokenIds.length; i++) {
    const owner = await itemNFTInstance.ownerOf(tokenIds[i])
    owner.should.be.equal(user)
  }
}
async function approveFota(user, approveAmount) {
  const userOption = {
    from: user
  }
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.approve(eatherSaleInstance.address, approveAmount, userOption)
  const allowance = await fotaTokenInstance.allowance(user, eatherSaleInstance.address)
  allowance.should.be.a.bignumber.that.equals(approveAmount)
}

async function approveBusd(user, approveAmount) {
  const userOption = {
    from: user
  }
  const busdTokenInstance = await loadBusdInstance()
  await busdTokenInstance.approve(eatherSaleInstance.address, approveAmount, userOption)
  const allowance = await busdTokenInstance.allowance(user, eatherSaleInstance.address)
  allowance.should.be.a.bignumber.that.equals(approveAmount)
}

async function approveUsdt(user, approveAmount) {
  const userOption = {
    from: user
  }
  const usdtTokenInstance = await loadUsdtInstance()
  await usdtTokenInstance.approve(eatherSaleInstance.address, approveAmount, userOption)
  const allowance = await usdtTokenInstance.allowance(user, eatherSaleInstance.address)
  allowance.should.be.a.bignumber.that.equals(approveAmount)
}

async function loadFotaInstance() {
  const fotaAddress = await eatherSaleInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function loadFotaPricerInstance() {
  const fotaPricerInstanceAddress = await eatherSaleInstance.fotaPricer()
  return FOTAPricer.at(fotaPricerInstanceAddress)
}

async function loadBusdInstance() {
  const busdAddress = await eatherSaleInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await eatherSaleInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
}

async function loadMarketPlaceInstance() {
  const marketPlaceAddress = await eatherSaleInstance.marketPlace()
  return MarketPlace.at(marketPlaceAddress)
}

async function loadNFTInstance() {
  const itemTokenAddress = await eatherSaleInstance.itemToken()
  return ItemNFT.at(itemTokenAddress)
}

async function loadCitizenInstance() {
  const citizenAddress = await eatherSaleInstance.citizen()
  return Citizen.at(citizenAddress)
}

async function fundFota(user) {
  const fotaTokenInstanceInstance = await loadFotaInstance()
  await fotaTokenInstanceInstance.releaseGameAllocation(user, value1000BN)
  const balance = await fotaTokenInstanceInstance.balanceOf(user)
  balance.should.be.a.bignumber.that.equals(value1000String)
}

async function fundUsd(user) {
  const mbusdTokenInstance = await loadBusdInstance()
  const musdtTokenInstance = await loadUsdtInstance()
  await mbusdTokenInstance.transfer(user, value1000BN)
  await musdtTokenInstance.transfer(user, value1000BN)
  const busdBalance = await mbusdTokenInstance.balanceOf(user)
  busdBalance.should.be.a.bignumber.that.equals(value1000String)
  const usdtBalance = await musdtTokenInstance.balanceOf(user)
  usdtBalance.should.be.a.bignumber.that.equals(value1000String)
}

function getTokenIdsFromResponse(response, index = 0) {
  return response.receipt.logs[index].args._tokenIds
}

async function register(user, userName = 'USERNAME') {
  const userOption = {
    from: user
  }
  const citizenInstance = await loadCitizenInstance()
  await citizenInstance.register(user, userName, accountsMap.zeroAddress, userOption)
}
