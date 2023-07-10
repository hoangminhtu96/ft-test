const FOTAToken = artifacts.require('./FOTAToken.sol')
const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const { listenEvent, accountsMap, value1BN, value2BN, value420MBN, BN, value1000BN, value1000String } = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevert,
  catchRevertWithReason
} = require('./utils/exceptions.js')

let privateSaleInstance
const allocatedIndex = 0
const priceIndex = 1

contract('PrivateSale', (accounts) => {
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        privateSaleInstance = await contracts.initPrivateSaleInstance(accounts)
        const fotaTokenInstance = await loadFotaInstance()
        fotaTokenInstance.setSaleAddress(privateSaleInstance.address, true)
      })
      it('Start vesting', async () => {
        const response = await privateSaleInstance.startVesting()
        listenEvent(response, 'VestingStated')
        const startVestingBlock = await privateSaleInstance.startVestingBlock()
        startVestingBlock.toNumber().should.be.equal(response.receipt.blockNumber)
       })
      it('Update vesting time', async () => {
        const oldVestingTime = await privateSaleInstance.vestingTime()
        await privateSaleInstance.updateVestingTime(oldVestingTime.toNumber() + 1)
        const newVestingTime = await privateSaleInstance.vestingTime()
        newVestingTime.toNumber().should.be.equal(oldVestingTime.toNumber() + 1)
      })
      it('Update TGE ratio', async () => {
        const oldRatio = await privateSaleInstance.tgeRatio()
        await privateSaleInstance.updateTGERatio(oldRatio.toNumber() + 1)
        const newRatio = await privateSaleInstance.tgeRatio()
        newRatio.toNumber().should.be.equal(oldRatio.toNumber() + 1)
      })
      it('Update fund admin', async () => {
        await privateSaleInstance.updateFundAdmin(accountsMap.user2)
        const newFundAdmin = await privateSaleInstance.fundAdmin()
        newFundAdmin.should.equal(accountsMap.user2)
        await setUserAllocations(false)
        await fundUsd(accountsMap.user1, privateSaleInstance)
        // await fotaTokenInstance.releasePrivateSaleAllocation(privateSaleInstance.address)
        const busdToken = await loadBusdInstance()
        const adminBalanceBefore = await busdToken.balanceOf(newFundAdmin)
        await buy(0, accountsMap.user1, false)
        const adminBalanceAfter = await busdToken.balanceOf(newFundAdmin)
        adminBalanceAfter.should.be.a.bignumber.that.equals(adminBalanceBefore.add(value2BN))
      })
      it('Set user allocations', async () => {
        await setUserAllocations(true)
      })
      it('Set user allocations with zero address', async () => {
        await setUserAllocationsWithZeroAddress()
      })
      it('Remove user allocations', async () => {
        await setUserAllocations(false)
        await privateSaleInstance.removeBuyerAllocation(accountsMap.user1)
        const buyer = await privateSaleInstance.getBuyer(accountsMap.user1)
        buyer[allocatedIndex].toNumber().should.be.equal(0)
      })
      it('Transfer ownership', async () => {
        const response = await privateSaleInstance.transferOwnership(accountsMap.user1)
        listenEvent(response, 'OwnershipTransferred')
        const isAdmin = await privateSaleInstance._isMainAdmin(accountsMap.mainAdminOption)
        isAdmin.should.be.false
        const isAdmin1 = await privateSaleInstance._isMainAdmin(accountsMap.validAccount1Option)
        isAdmin1.should.be.true
      })
    })
    describe('B. Fail', async () => {
      beforeEach(async () => {
        privateSaleInstance = await contracts.initPrivateSaleInstance(accounts)
        const fotaTokenInstance = await loadFotaInstance()
        fotaTokenInstance.setSaleAddress(privateSaleInstance.address, true)
      })
      it('Update fund admin: unauthorized', async () => {
        await catchRevertWithReason(privateSaleInstance.updateFundAdmin(accountsMap.user2, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Update fund admin: invalid value', async () => {
        await catchRevertWithReason(privateSaleInstance.updateFundAdmin(accountsMap.zeroAddress), 'PrivateSale: invalid address')
      })
      it('Start vesting: unauthorized', async () => {
        await catchRevertWithReason(privateSaleInstance.startVesting(accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Start vesting: called already', async () => {
        await privateSaleInstance.startVesting()
        await catchRevertWithReason(privateSaleInstance.startVesting(), 'PrivateSale: vesting had started')
      })
      it('Update vesting time: unauthorized', async () => {
        await catchRevertWithReason(privateSaleInstance.updateVestingTime(1, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Update vesting time: invalid value', async () => {
        await setUserAllocations(false)
        await fundUsd(accountsMap.user1)
        await buy(0, accountsMap.user1, false)
        await catchRevertWithReason(privateSaleInstance.updateVestingTime(1), 'PrivateSale: user had bought')
      })
      it('Update TGE ratio: unauthorized', async () => {
        await catchRevertWithReason(privateSaleInstance.updateTGERatio(1, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Update TGE ratio: invalid value', async () => {
        await catchRevertWithReason(privateSaleInstance.updateTGERatio(100), 'PrivateSale: invalid ratio')
        await setUserAllocations(false)
        await fundUsd(accountsMap.user1)
        await buy(0, accountsMap.user1, false)
        await catchRevertWithReason(privateSaleInstance.updateTGERatio(1), 'PrivateSale: user had bought')
      })
      it('Set user allocations: unauthorized', async () => {
        const buyers = [accountsMap.user1, accountsMap.user2]
        const amounts = [value1BN, value1BN]
        const prices = [value2BN, value2BN]
        await catchRevertWithReason(privateSaleInstance.setUserAllocations(buyers, amounts, prices, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Set user allocations: wrong values', async () => {
        const buyers = [accountsMap.user1]
        const amounts = [value1BN, value1BN]
        const prices = [value2BN, value2BN]
        await catchRevertWithReason(privateSaleInstance.setUserAllocations(buyers, amounts, prices), 'PrivateSale: invalid data input')
        await catchRevertWithReason(privateSaleInstance.setUserAllocations(buyers, [], prices), 'PrivateSale: invalid data input')
        await catchRevertWithReason(privateSaleInstance.setUserAllocations(buyers, amounts, []), 'PrivateSale: invalid data input')
      })
      it('Set user allocations: over cap', async () => {
        const buyers = [accountsMap.user1, accountsMap.user2]
        const amounts = [value420MBN, value1BN]
        const prices = [value2BN, value2BN]
        await catchRevertWithReason(privateSaleInstance.setUserAllocations(buyers, amounts, prices), 'PrivateSale: amount invalid')
      })
      it('Remove user allocations: unauthorized', async () => {
        await setUserAllocations(false)
        await catchRevertWithReason(privateSaleInstance.removeBuyerAllocation(accountsMap.user1, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Remove user allocations: wrong values', async () => {
        await setUserAllocations(false)
        await catchRevertWithReason(privateSaleInstance.removeBuyerAllocation(accountsMap.user3), 'PrivateSale: User have no allocation')
        await fundUsd(accountsMap.user1, privateSaleInstance)
        await buy(0, accountsMap.user1, false)
        await catchRevertWithReason(privateSaleInstance.removeBuyerAllocation(accountsMap.user1), 'PrivateSale: User have bought already')
      })
      it('Transfer ownership: unauthorized', async () => {
        await catchRevertWithReason(privateSaleInstance.transferOwnership(accountsMap.user1, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('Update fund admin: invalid value', async () => {
        await catchRevert(privateSaleInstance.transferOwnership(accountsMap.zeroAddress))
      })
    })
  })
  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        privateSaleInstance = await contracts.initPrivateSaleInstance(accounts)
        const fotaTokenInstance = await loadFotaInstance()
        fotaTokenInstance.setSaleAddress(privateSaleInstance.address, true)
        await setUserAllocations(false)
      })
      it('Buy successful', async () => {
        await fundUsd(accountsMap.user1)
        await fundUsd(accountsMap.user2)
        await buy(0, accountsMap.user1, true)
        await buy(1, accountsMap.user2, true)
	    })
      it('Claim successful', async () => {
        await fundUsd(accountsMap.user1)
        await buy(0, accountsMap.user1)
        await privateSaleInstance.startVesting()
        const buyer = await privateSaleInstance.getBuyer(accountsMap.user1)
        const userTGETokenAmount = buyer[allocatedIndex].mul(new BN('20')).div(new BN('100'))
        const fotaTokenInstance = await loadFotaInstance(privateSaleInstance)
        const userFotaOldBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        const response = await privateSaleInstance.claim(accountsMap.validAccount1Option)
        listenEvent(response, 'Claimed')
        let userFotaNewBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        userFotaNewBalance.should.be.a.bignumber.that.equals(userFotaOldBalance.add(userTGETokenAmount))

        await privateSaleInstance.claim(accountsMap.validAccount1Option)
        userFotaNewBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        userFotaNewBalance.should.be.a.bignumber.that.gt(userFotaOldBalance.add(userTGETokenAmount))
        userFotaNewBalance.should.be.a.bignumber.that.lt(userFotaOldBalance.add(userTGETokenAmount).add(userTGETokenAmount))
	    })
    })
    describe('B. Failed', async () => {
      before(async () => {
        privateSaleInstance = await contracts.initPrivateSaleInstance(accounts)
        const fotaTokenInstance = await loadFotaInstance()
        fotaTokenInstance.setSaleAddress(privateSaleInstance.address, true)
        await setUserAllocations(false)
      })
      it('Have no allocation', async () => {
        await catchRevertWithReason(privateSaleInstance.buy(0, accountsMap.accountUnauthorizedOption), 'PrivateSale: You have no allocation')
      })
      it('Have bought allocation', async () => {
        await fundUsd(accountsMap.user1, privateSaleInstance)
        await buy(0, accountsMap.user1, true)
        await catchRevertWithReason(privateSaleInstance.buy(0, accountsMap.validAccount1Option), 'PrivateSale: You had bought')
      })
      it('Have not approve', async () => {
        await catchRevertWithReason(privateSaleInstance.buy(1, accountsMap.validAccount2Option), 'PrivateSale: please approve usd token first')
      })
      it('Have no money', async () => {
        const usdTokenInstance = await loadUsdtInstance(privateSaleInstance)
        await usdTokenInstance.approve(privateSaleInstance.address, value2BN, accountsMap.validAccount2Option)
        await catchRevertWithReason(privateSaleInstance.buy(1, accountsMap.validAccount2Option), 'PrivateSale: please fund your account')
      })
      it('Claim: vesting not started', async () => {
        await catchRevertWithReason(privateSaleInstance.claim(accountsMap.accountUnauthorizedOption), 'PrivateSale: please wait more time')
      })
      it('Claim: unauthorized', async () => {
        await privateSaleInstance.startVesting()
        await catchRevertWithReason(privateSaleInstance.claim(accountsMap.accountUnauthorizedOption), 'PrivateSale: You have no allocation')
      })
    })
  })
})

async function setUserAllocations(test) {
  const buyers = [accountsMap.user1, accountsMap.user2]
  const amounts = [value1BN, value1BN]
  const prices = [2000, 2000]
  const response = await privateSaleInstance.setUserAllocations(buyers, amounts, prices)
  const buyer = await privateSaleInstance.getBuyer(accountsMap.user1)
  if (test) {
    listenEvent(response, 'UserAllocated', 0)
    listenEvent(response, 'UserAllocated', 1)
    buyer[allocatedIndex].should.be.a.bignumber.that.equals(value1BN)
    buyer[priceIndex].toNumber().should.be.equals(2000)
  }
}

async function setUserAllocationsWithZeroAddress() {
  const buyers = [accountsMap.zeroAddress]
  const amounts = [value1BN]
  const prices = [1000]
  const response = await privateSaleInstance.setUserAllocations(buyers, amounts, prices)
  response.logs.length.should.be.equal(0)
}

async function buy(usdCurrency, user, test) {
  const userOption = {
    from: user
  }
  let usdTokenInstance
  if (usdCurrency === 0) {
    usdTokenInstance = await loadBusdInstance(privateSaleInstance)
  } else {
    usdTokenInstance = await loadUsdtInstance(privateSaleInstance)
  }
  const usdBalanceBefore = await usdTokenInstance.balanceOf(user)
  await usdTokenInstance.approve(privateSaleInstance.address, value2BN, userOption)
  const response = await privateSaleInstance.buy(usdCurrency, userOption)
  if (test) {
    const usdBalanceAfter = await usdTokenInstance.balanceOf(user)
    listenEvent(response, 'Bought', 0)
    usdBalanceAfter.should.be.a.bignumber.that.equals(usdBalanceBefore.sub(value2BN))
  }
}

async function loadFotaInstance() {
  const fotaAddress = await privateSaleInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function loadBusdInstance() {
  const busdAddress = await privateSaleInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await privateSaleInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
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
