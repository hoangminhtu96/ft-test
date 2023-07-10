const { listenEvent, accountsMap } = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevertWithReason
} = require('./utils/exceptions.js')
let fotaPricerInstance

contract('FOTAPricer', (accounts) => {
  describe('A. Success', async () => {
    beforeEach(async () => {
      fotaPricerInstance = await contracts.initFotaPricerInstance(accounts)
    })
    it('updateMainAdmin', async () => {
      const newAdmin = accountsMap.user1
      const response = await fotaPricerInstance.transferOwnership(newAdmin)
      listenEvent(response, 'OwnershipTransferred')
      await catchRevertWithReason(fotaPricerInstance.transferOwnership(newAdmin), 'onlyMainAdmin')
      const response2 = await fotaPricerInstance.transferOwnership(accountsMap.user2, { from: newAdmin })
      listenEvent(response2, 'OwnershipTransferred')
    })
    it('updateNormalPriceAdmin', async () => {
      const newAdmin = accountsMap.user1
      await fotaPricerInstance.updateNormalPriceAdmin(newAdmin)
      const currentPrice = await fotaPricerInstance.fotaPrice()
      const responseNewAdmin = await fotaPricerInstance.syncFOTAPrice(currentPrice.toNumber() + 1, { from: newAdmin })
      listenEvent(responseNewAdmin, 'FOTAPriceSynced')
    })
    it('updateMinMaxPriceAdmin', async () => {
      const newAdmin = accountsMap.user1
      await fotaPricerInstance.updateMinMaxPriceAdmin(newAdmin)
      await updateMinMaxPrice(newAdmin)
    })
    it('updateAbsMinMaxPriceAdmin', async () => {
      const newAdmin = accountsMap.user1
      await fotaPricerInstance.updateAbsMinMaxPriceAdmin(newAdmin)
      await updateAbsMinMaxPrice(newAdmin)
    })
    it('updateNormalPrice', async () => {
      // normalPriceAdmin can update
      const newAdmin = accountsMap.user1
      await fotaPricerInstance.updateNormalPriceAdmin(newAdmin)
      const currentPrice = await fotaPricerInstance.fotaPrice()
      const responseNewAdmin = await fotaPricerInstance.syncFOTAPrice(currentPrice.toNumber() + 1, { from: newAdmin })
      listenEvent(responseNewAdmin, 'FOTAPriceSynced')
      const newAdminPrice = await fotaPricerInstance.fotaPrice()
      newAdminPrice.toNumber().should.equal(currentPrice.toNumber() + 1)

      // mainAdmin can do it also
      const response = await fotaPricerInstance.syncFOTAPrice(newAdminPrice.toNumber() + 1)
      listenEvent(response, 'FOTAPriceSynced')
      const newPrice = await fotaPricerInstance.fotaPrice()
      newPrice.toNumber().should.equal(newAdminPrice.toNumber() + 1)
    })
    it('updateAbsMinMaxPrice', async () => {
      // absMinMaxAdmin can update
      const newAdmin = accountsMap.user1
      await fotaPricerInstance.updateAbsMinMaxPriceAdmin(newAdmin)
      await updateAbsMinMaxPrice(newAdmin, 1000, 10000)
      // mainAdmin can do it also
      await updateAbsMinMaxPrice(accountsMap.mainAdmin, 1000, 10000)
    })
    it('updateMinMaxPrice', async () => {
      // minMaxAdmin can update
      const newAdmin = accountsMap.user1
      await fotaPricerInstance.updateMinMaxPriceAdmin(newAdmin)
      await updateMinMaxPrice(newAdmin)

      // mainAdmin can do it also
      await updateMinMaxPrice(accountsMap.mainAdmin)

      // higher absMax
      const absMaxPrice = await fotaPricerInstance.absMaxPrice()
      const response3 = await fotaPricerInstance.updateMinMaxPrice(absMaxPrice.toNumber() + 1, { from: newAdmin })
      listenEvent(response3, 'Warning')
      // lower absMin
      const currentPrice = await fotaPricerInstance.fotaPrice()
      await updateAbsMinMaxPrice(accountsMap.mainAdmin, currentPrice.toNumber() - 1, absMaxPrice.toNumber())
      const response2 = await fotaPricerInstance.updateMinMaxPrice(currentPrice.toNumber() - 1, { from: newAdmin })
      listenEvent(response2, 'Warning')
    })
  })
  describe('B. Fail', async () => {
    before(async () => {
      fotaPricerInstance = await contracts.initFotaPricerInstance(accounts)
    })
    it('updateNormalPriceAdmin: unauthorized', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateNormalPriceAdmin(accountsMap.user1, { from: accountsMap.user1 }), "onlyMainAdmin")
    })
    it('updateNormalPriceAdmin: wrong value', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateNormalPriceAdmin(accountsMap.zeroAddress), "Invalid address")
    })
    it('updateMinMaxPriceAdmin: unauthorized', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateMinMaxPriceAdmin(accountsMap.user1, { from: accountsMap.user1 }), "onlyMainAdmin")
    })
    it('updateMinMaxPriceAdmin: wrong value', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateMinMaxPriceAdmin(accountsMap.zeroAddress), "Invalid address")
    })
    it('updateAbsMinMaxPriceAdmin: unauthorized', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateAbsMinMaxPriceAdmin(accountsMap.user1, { from: accountsMap.user1 }), "onlyMainAdmin")
    })
    it('updateAbsMinMaxPriceAdmin: wrong value', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateAbsMinMaxPriceAdmin(accountsMap.zeroAddress), "Invalid address")
    })
    it('syncFOTAPrice: unauthorized', async () => {
      const minPrice = await fotaPricerInstance.minPrice()
      await catchRevertWithReason(fotaPricerInstance.syncFOTAPrice(minPrice.toNumber() + 1, { from: accountsMap.user1 }), "onlyNormalPriceAdmin")
    })
    it('syncFOTAPrice: invalid value', async () => {
      const minPrice = await fotaPricerInstance.minPrice()
      const maxPrice = await fotaPricerInstance.maxPrice()
      await catchRevertWithReason(fotaPricerInstance.syncFOTAPrice(minPrice.toNumber() - 1), "Price is invalid")
      await catchRevertWithReason(fotaPricerInstance.syncFOTAPrice(maxPrice.toNumber() + 1), "Price is invalid")
    })
    it('updateMinMaxPrice: unauthorized', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateMinMaxPrice(0, { from: accountsMap.user1 }), "onlyMinMaxPriceAdmin")
    })
    it('updateAbsMinMaxPrice: unauthorized', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateAbsMinMaxPrice(0, 1, { from: accountsMap.user1 }), "onlyAbsMinMaxPriceAdmin")
    })
    it('updateAbsMinMaxPrice: wrong value', async () => {
      await catchRevertWithReason(fotaPricerInstance.updateAbsMinMaxPrice(1, 1), "Price is invalid")
    })
  })
})

async function updateMinMaxPrice(newAdmin) {
  const realtimePrice = 1500
  const currentPrice = await fotaPricerInstance.fotaPrice()
  await fotaPricerInstance.updateMinMaxPrice(realtimePrice, { from: newAdmin })
  const minPrice = await fotaPricerInstance.minPrice()
  const maxPrice = await fotaPricerInstance.maxPrice()
  minPrice.toNumber().should.equal(currentPrice.toNumber() * 0.9)
  maxPrice.toNumber().should.equal(realtimePrice * 1.05)
}

async function updateAbsMinMaxPrice(newAdmin, absMinPrice = 1, absMaxPrice = 10000) {
  await fotaPricerInstance.updateAbsMinMaxPrice(absMinPrice, absMaxPrice, { from: newAdmin })
  const newAbsMinPrice = await fotaPricerInstance.absMinPrice()
  const newAbsMaxPrice = await fotaPricerInstance.absMaxPrice()
  newAbsMinPrice.toNumber().should.equal(absMinPrice)
  newAbsMaxPrice.toNumber().should.equal(absMaxPrice)
}
