const FOTAToken = artifacts.require('./FOTAToken.sol')
const LandNFT = artifacts.require('./LandNFT.sol')
const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const FOTAGamePVE = artifacts.require('./FOTAGamePVE.sol')
const { listenEvent, accountsMap, BN, value1BN, value1000BN } = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevertWithReason
} = require('./utils/exceptions.js')

let landLordManagerInstance

const CURRENCY_FOTA = 0
const CURRENCY_BUSD = 1
const CURRENCY_USDT = 2
const shareHolderLengthIndex = 0
const shareHolderValueIndex = 1

contract('LandLordManager', (accounts) => {
  describe('A. Success', async () => {
    beforeEach(async () => {
      landLordManagerInstance = await contracts.initLandLordManager(accounts)
    })
    it('Admin can set land price', async () => {
      const response = await setFoundingPrice(1, value1BN)
      listenEvent(response, 'FoundingPriceUpdated')
    })
    it('Admin can set min price', async () => {
      const response = await updateMinPrice(value1000BN, value1BN)
      listenEvent(response, 'MinPriceUpdated')
      const landMinPrice = await landLordManagerInstance.landMinPrice()
      const shareMinPrice = await landLordManagerInstance.shareMinPrice()
      landMinPrice.should.be.a.bignumber.that.equal(value1000BN)
      shareMinPrice.should.be.a.bignumber.that.equal(value1BN)
    })
    it('Admin can update share holder', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeOrder(orderId, price, accountsMap.user2)
      const oldInfo = await landLordManagerInstance.getShareHolderInfo(mission, accountsMap.user2)
      const response = await landLordManagerInstance.updateShareHolder(mission, accountsMap.user2, accountsMap.user3)
      listenEvent(response, 'ShareHolderChanged')
      const newInfo = await landLordManagerInstance.getShareHolderInfo(mission, accountsMap.user3)
      oldInfo[shareHolderLengthIndex].toNumber().should.equal(newInfo[shareHolderLengthIndex].toNumber())
      oldInfo[shareHolderValueIndex].toNumber().should.equal(newInfo[shareHolderValueIndex].toNumber())

      const oldHolderNewInfo = await landLordManagerInstance.getShareHolderInfo(mission, accountsMap.user2)
      oldHolderNewInfo[shareHolderValueIndex].toNumber().should.equal(0)
    })
    it('User can buy founding land', async () => {
      const mission = 1
      await takeFounding(mission, value1BN, accountsMap.user1, true)
    })
    it('User can buy founding land multiple times', async () => {
      await takeFounding(1, value1BN, accountsMap.user1)
      await takeFounding(2, value1BN, accountsMap.user1)
    })
    it('Land lord can make land order', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      await makeLandOrder(mission, price, accountsMap.user1)
      const landNFTInstance = await loadLandNFTInstance()
      const owner = await landNFTInstance.ownerOf(mission)
      owner.should.be.equal(landLordManagerInstance.address)
    })
    it('Land lord can make land order multiple times', async () => {
      const mission1 = 1
      const mission2 = 2
      const price = value1BN
      await takeFounding(mission1, price, accountsMap.user1)
      await takeFounding(mission2, price, accountsMap.user1)
      await makeLandOrder(mission1, price, accountsMap.user1)
      await makeLandOrder(mission2, price, accountsMap.user1)
    })
    it('User can take land order', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeLandOrder(mission, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeLandOrder(orderId, price, accountsMap.user2)
    })
    it('All landlord"s share order will be canceled after land order get taken', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeLandOrder(mission, price, accountsMap.user1)
      const shareOrderId = await makeOrder(mission, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeLandOrder(orderId, price, accountsMap.user2)
      const shareOrder = await landLordManagerInstance.shareOrders(shareOrderId)
      shareOrder.active.should.be.false
    })
    it('User can take land order multiple times', async () => {
      const mission1 = 1
      const mission2 = 2
      const price = value1BN
      await takeFounding(mission1, price, accountsMap.user1)
      await takeFounding(mission2, price, accountsMap.user1)
      const orderId1 = await makeLandOrder(mission1, price, accountsMap.user1)
      const orderId2 = await makeLandOrder(mission2, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeLandOrder(orderId1, price, accountsMap.user2)
      await takeLandOrder(orderId2, price, accountsMap.user2)
    })
    it('Land lord can make share order', async () => {
      const mission = 1
      const price = value1BN
      const user = accountsMap.user1
      await takeFounding(mission, price, user)
      const orderId = await makeOrder(mission, price, user)
      const ownerActiveShareOrder = await landLordManagerInstance.ownerActiveShareOrders(user, 0)
      ownerActiveShareOrder.toNumber().should.equal(orderId.toNumber())
    })
    it('Land lord can make share order multiple times', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      await makeOrder(mission, price, accountsMap.user1)
      await makeOrder(mission, price, accountsMap.user1)
    })
    it ('Token holder can give reward', async () => {
      await giveReward(1, value1BN, accountsMap.user2)
    })
    it('Land lord can claim reward alone', async () => {
      const mission = 1
      const price = value1BN
      const rewardAmount = value1BN
      const landLord = accountsMap.user1
      await takeFounding(mission, price, landLord)

      await giveReward(mission, rewardAmount, accountsMap.mainAdmin)

      const fotaTokenInstance = await loadFotaInstance()
      const landLordBalanceBefore = await fotaTokenInstance.balanceOf(landLord)
      const response = await landLordManagerInstance.claim(mission, { from: landLord })
      listenEvent(response, 'Claimed')
      const landLordBalanceAfter = await fotaTokenInstance.balanceOf(landLord)
      landLordBalanceAfter.should.be.a.bignumber.that.equal(landLordBalanceBefore.add(rewardAmount))
    })
    it('Land lord can claim reward with share holders', async () => {
      const mission = 1
      const price = value1BN
      const rewardAmount = value1BN
      const landLord = accountsMap.user1
      const shareHolder = accountsMap.user2
      await takeFounding(mission, price, landLord)
      const orderId = await makeOrder(mission, price, landLord, 50000)
      await fundFota(shareHolder)
      await takeOrder(orderId, price, shareHolder)

      await giveReward(mission, rewardAmount, accountsMap.mainAdmin)

      const fotaTokenInstance = await loadFotaInstance()
      const landLordBalanceBefore = await fotaTokenInstance.balanceOf(landLord)
      const shareHolderBalanceBefore = await fotaTokenInstance.balanceOf(shareHolder)
      const response = await landLordManagerInstance.claim(mission, { from: landLord })
      listenEvent(response, 'Claimed')
      const landLordBalanceAfter = await fotaTokenInstance.balanceOf(landLord)
      const shareHolderBalanceAfter = await fotaTokenInstance.balanceOf(shareHolder)
      landLordBalanceAfter.should.be.a.bignumber.that.equal(landLordBalanceBefore.add(rewardAmount.div(new BN(2))))
      shareHolderBalanceAfter.should.be.a.bignumber.that.equal(shareHolderBalanceBefore.add(rewardAmount.div(new BN(2))))
    })
    it('Land lord can claim reward with share holders after admin update holder', async () => {
      const mission = 1
      const price = value1BN
      const rewardAmount = value1BN
      const landLord = accountsMap.user1
      const shareHolder = accountsMap.user2
      const newShareHolder = accountsMap.user3
      await takeFounding(mission, price, landLord)
      const orderId = await makeOrder(mission, price, landLord, 30000)
      await fundFota(shareHolder)
      await takeOrder(orderId, price, shareHolder)

      await giveReward(mission, rewardAmount, accountsMap.mainAdmin)

      await landLordManagerInstance.updateShareHolder(mission, shareHolder, newShareHolder)

      const orderId2 = await makeOrder(mission, price, landLord, 20000)
      await fundFota(shareHolder)
      await takeOrder(orderId2, price, shareHolder)

      await landLordManagerInstance.updateShareHolder(mission, shareHolder, newShareHolder)

      const fotaTokenInstance = await loadFotaInstance()
      const landLordBalanceBefore = await fotaTokenInstance.balanceOf(landLord)
      const shareHolderBalanceBefore = await fotaTokenInstance.balanceOf(shareHolder)
      const newShareHolderBalanceBefore = await fotaTokenInstance.balanceOf(newShareHolder)
      const response = await landLordManagerInstance.claim(mission, { from: landLord })
      listenEvent(response, 'Claimed')
      const landLordBalanceAfter = await fotaTokenInstance.balanceOf(landLord)
      const shareHolderBalanceAfter = await fotaTokenInstance.balanceOf(shareHolder)
      const newShareHolderBalanceAfter = await fotaTokenInstance.balanceOf(newShareHolder)
      landLordBalanceAfter.should.be.a.bignumber.that.equal(landLordBalanceBefore.add(rewardAmount.div(new BN(2))))
      shareHolderBalanceAfter.should.be.a.bignumber.that.equal(shareHolderBalanceBefore)
      newShareHolderBalanceAfter.should.be.a.bignumber.that.equal(newShareHolderBalanceBefore.add(rewardAmount.div(new BN(2))))
    })
    it('User can take share order', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeOrder(orderId, price, accountsMap.user2)
    })
    it('User can take share order multiple times', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const sharePercent = 10000
      const orderId1 = await makeOrder(mission, price, accountsMap.user1, sharePercent)
      const orderId2 = await makeOrder(mission, price, accountsMap.user1, sharePercent)
      console.log('orderId1', orderId1.toNumber())
      console.log('orderId2', orderId2.toNumber())
      await fundFota(accountsMap.user2)
      await takeOrder(orderId1, price, accountsMap.user2)
      await takeOrder(orderId2, price, accountsMap.user2)
      const info = await landLordManagerInstance.getShareHolderInfo(mission, accountsMap.user2)
      info[shareHolderLengthIndex].toNumber().should.equal(1)
      info[shareHolderValueIndex].toNumber().should.equal(sharePercent * 2)
    })
    it('Share holder can make share order', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeOrder(orderId, price, accountsMap.user2)
      await makeOrder(mission, price, accountsMap.user2, 5)
    })
    it('Share holder can make share order multiple times', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1)
      await fundFota(accountsMap.user2)
      await takeOrder(orderId, price, accountsMap.user2)
      await makeOrder(mission, price, accountsMap.user2, 5)
      await makeOrder(mission, price, accountsMap.user2, 3)
    })
    it('Share maker can cancel order', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1)
      const response = await landLordManagerInstance.cancelOrder(orderId)
      listenEvent(response, 'OrderCanceled')
      response.logs[0].args.orderId.should.be.a.bignumber.that.equal(orderId)
    })
    it('Landlord maker can cancel order', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)

      const orderId = await makeLandOrder(mission, price, accountsMap.user1)
      const response = await landLordManagerInstance.cancelOrder(orderId)
      listenEvent(response, 'OrderCanceled')
      response.logs[0].args.orderId.should.be.a.bignumber.that.equal(orderId)
      const landNFTInstance = await loadLandNFTInstance()
      const owner = await landNFTInstance.ownerOf(mission)
      owner.should.be.equal(accountsMap.user1)
    })
  })
  describe('B. Fail', async () => {
    beforeEach(async () => {
      landLordManagerInstance = await contracts.initLandLordManager(accounts)
    })
    it('Can not buy founding when it not listed', async () => {
      const mission = 1
      const fotaTokenInstanceInstance = await loadFotaInstance()
      await fotaTokenInstanceInstance.approve(landLordManagerInstance.address, value1BN)
      await catchRevertWithReason(landLordManagerInstance.takeFounding(mission, CURRENCY_FOTA), 'Land is not available')
    })
    it('Can not buy founding when it taken', async () => {
      const mission = 1
      await takeFounding(mission, value1BN, accountsMap.user1)
      await catchRevertWithReason(takeFounding(mission, value1BN, accountsMap.user1), 'Land have land lord already')
    })
    it('Land lord/share holder can not make share order over he has', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1, 10000)
      await fundFota(accountsMap.user2)
      await takeOrder(orderId, price, accountsMap.user2)
      await catchRevertWithReason(landLordManagerInstance.makeShareOrder(mission, 90000 + 1, price, accountsMap.validAccount1Option), 'Maker invalid')

      const orderId2 = await makeOrder(mission, price, accountsMap.user2, 5000)
      await fundFota(accountsMap.user3)
      await takeOrder(orderId2, price, accountsMap.user3)
      await catchRevertWithReason(landLordManagerInstance.makeShareOrder(mission, 5000 + 1, price, accountsMap.validAccount2Option), 'Maker invalid')
    })
    it('User can not make share/land order when he have no right', async () => {
      const mission = 1
      await catchRevertWithReason(landLordManagerInstance.makeShareOrder(mission, 1, value1BN, accountsMap.validAccount2Option), 'Maker invalid')
      await catchRevertWithReason(landLordManagerInstance.makeLandOrder(mission, value1BN, accountsMap.validAccount2Option), 'Only land lord')
    })
    it('User can not cancel order when he have no rights', async () => {
      const mission = 1
      const price = value1BN
      await takeFounding(mission, price, accountsMap.user1)
      const orderId = await makeOrder(mission, price, accountsMap.user1)
      await catchRevertWithReason(landLordManagerInstance.cancelOrder(orderId, accountsMap.accountUnauthorizedOption), '401')
    })
    it('Land lord can not make land order twice', async () => {
        const mission1 = 1
        const price = value1BN
        await takeFounding(mission1, price, accountsMap.user1)
        await makeLandOrder(mission1, price, accountsMap.user1)
        await catchRevertWithReason(makeLandOrder(mission1, price, accountsMap.user1), "This land is selling")
    })
    it('Land lord can not claim after he make land order', async () => {
        const mission = 1
        const price = value1BN
        const rewardAmount = value1BN

        await takeFounding(mission, price, accountsMap.user1)
        await makeLandOrder(mission, price, accountsMap.user1)
        await giveReward(mission, rewardAmount, accountsMap.mainAdmin)

        await catchRevertWithReason(landLordManagerInstance.claim(mission, { from: accountsMap.user1 }), "Only land lord")
    })
  })
})

async function setFoundingPrice(mission, price) {
  return landLordManagerInstance.setFoundingPrice(mission, price)
}

async function updateMinPrice(landMinPrice, shaMinPrice) {
  return landLordManagerInstance.updateMinPrice(landMinPrice, shaMinPrice)
}

async function takeFounding(mission, price, user, test = false) {
  if (test) {
    await landLordManagerInstance.updateFundAdmin(accountsMap.user10)
  }
  await setFoundingPrice(mission, price)
  await fundFota(user)
  const fotaTokenInstanceInstance = await loadFotaInstance()
  await fotaTokenInstanceInstance.approve(landLordManagerInstance.address, price, { from: user })
  const response = await landLordManagerInstance.takeFounding(mission, CURRENCY_FOTA, { from: user })
  if (test) {
    listenEvent(response, 'LandLordGranted')
    const land = await landLordManagerInstance.lands(mission)
    land.landLord.should.eql(user)
    land.landLordPercentage.toNumber().should.eql(100000)
    const landNFTInstance = await loadLandNFTInstance()
    const owner = await landNFTInstance.ownerOf(mission)
    owner.should.equal(user)
    const fotaTokenInstance = await loadFotaInstance()
    const adminBalance = await fotaTokenInstance.balanceOf(accountsMap.user10)
    adminBalance.should.be.a.bignumber.that.equal(price)
  }
}

async function makeLandOrder(mission, price, user) {
  const landNFTInstance = await loadLandNFTInstance()
  await landNFTInstance.setApprovalForAll(landLordManagerInstance.address, true, { from: user })
  const response = await landLordManagerInstance.makeLandOrder(mission, price, { from: user })
  listenEvent(response, 'OrderCreated')
  return response.logs[0].args.orderId
}

async function takeLandOrder(orderId, price, user) {
  const fotaTokenInstanceInstance = await loadFotaInstance()
  await fotaTokenInstanceInstance.approve(landLordManagerInstance.address, price, { from: user })
  const response = await landLordManagerInstance.takeLandOrder(orderId, CURRENCY_FOTA, { from: user })
  listenEvent(response, 'OrderTaken')
  const order = await landLordManagerInstance.landOrders(response.logs[response.logs.length - 1].args.orderId)
  const land = await landLordManagerInstance.lands(order.mission)
  land.landLord.should.eql(accountsMap.user2)
}

async function makeOrder(mission, price, user, sharePercent = 10000) {
  const response = await landLordManagerInstance.makeShareOrder(mission, sharePercent, price, { from: user })
  listenEvent(response, 'OrderCreated')
  return response.logs[0].args.orderId
}

async function takeOrder(orderId, price, user) {
  const fotaTokenInstanceInstance = await loadFotaInstance()
  await fotaTokenInstanceInstance.approve(landLordManagerInstance.address, price, { from: user })
  const response = await landLordManagerInstance.takeShareOrder(orderId, CURRENCY_FOTA, { from: user })
  listenEvent(response, 'OrderTaken')
  return response
}

async function fundFota(user) {
  const fotaTokenInstanceInstance = await loadFotaInstance()
  await fotaTokenInstanceInstance.releaseGameAllocation(user, value1000BN)
}

async function loadFotaInstance() {
  const fotaAddress = await landLordManagerInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function loadBusdInstance() {
  const busdAddress = await landLordManagerInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await landLordManagerInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
}

async function loadPveInstance() {
  const pveAddress = await landLordManagerInstance.gamePve()
  return FOTAGamePVE.at(pveAddress)
}

async function loadLandNFTInstance() {
  const landAddress = await landLordManagerInstance.landNFT()
  return LandNFT.at(landAddress)
}

async function giveReward(mission, rewardAmount, user) {
  await fundFota(user)
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.approve(landLordManagerInstance.address, rewardAmount, { from: user })
  await landLordManagerInstance.giveReward(mission, rewardAmount, { from: user })
  const land = await landLordManagerInstance.lands(mission)
  land.pendingReward.should.be.a.bignumber.that.equal(rewardAmount)
}
