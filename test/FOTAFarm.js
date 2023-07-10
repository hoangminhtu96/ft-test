const moment = require('moment')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const contracts = require('./utils/contracts')
const {accountsMap, listenEvent, value1BN, value3BN, value1000BN, value1000String} = require('./utils')
const {catchRevertWithReason} = require('./utils/exceptions')
const timerHelper = require('./utils/timer')

let fotaFarm

contract('FOTAFarm', (accounts) => {
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach( async () => {
        fotaFarm = await contracts.initFOTAFarmInstance(accounts)
      })
      it('start', async () => {
        const initStartTime = await fotaFarm.startTime()
        initStartTime.toNumber().should.be.zero
        const startTimeValue = moment().subtract(1, 'd').startOf('d').unix()
        await fotaFarm.start(startTimeValue)
        const startTime = await fotaFarm.startTime()
        startTime.toNumber().should.be.equal(startTimeValue)
      })
      it('rewardingDays', async () => {
        const currentRewardingDays = await fotaFarm.rewardingDays()
        const response = await fotaFarm.updateRewardingDays(currentRewardingDays.toNumber() + 1)
        listenEvent(response, 'RewardingDaysUpdated')
        const newRewardingDays = await fotaFarm.rewardingDays()
        newRewardingDays.toNumber().should.be.equal(currentRewardingDays.toNumber() + 1)
      })
      it('updateLPBonusRate', async () => {
        const currentLPBonusRate = await fotaFarm.lpBonus()
        const response = await fotaFarm.updateLPBonusRate(currentLPBonusRate.add(value1BN))
        listenEvent(response, 'LPBonusRateUpdated')
        const newLPBonusRate = await fotaFarm.lpBonus()
        newLPBonusRate.should.be.a.bignumber.that.equal(currentLPBonusRate.add(value1BN))
      })
      it('drainToken', async () => {
        const startTimeValue = moment().subtract(1, 'd').startOf('d').unix()
        await fotaFarm.start(startTimeValue)
        await fundFOTAToFarmAndMoveToTomorrow()
        const fotaTokenInstance = await loadFotaInstance()
        const balanceBefore = await fotaTokenInstance.balanceOf(accountsMap.mainAdmin)
        await fotaFarm.drainToken(fotaTokenInstance.address, value1BN)
        const balanceAfter = await fotaTokenInstance.balanceOf(accountsMap.mainAdmin)
        balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.add(value1BN))
      })
      it('setContracts', async () => {
        const fotaTokenInstance = await contracts.initFotaTokenInstance(accounts)
        const oldTokenAddress = await fotaFarm.fotaToken()
        await fotaFarm.setContracts(fotaTokenInstance.address, fotaTokenInstance.address)
        const newTokenAddress = await fotaFarm.fotaToken()
        const lpAddress = await fotaFarm.lpToken()
        newTokenAddress.should.be.not.equal(oldTokenAddress)
        newTokenAddress.should.be.equal(fotaTokenInstance.address)
        lpAddress.should.be.equal(fotaTokenInstance.address)
      })
    })
    describe('B. Fail', async () => {
      beforeEach( async () => {
        fotaFarm = await contracts.initFOTAFarmInstance(accounts)
      })
      it('start: unauthorized', async () => {
        const startTimeValue = moment().subtract(1, 'd').startOf('d').unix()
        await catchRevertWithReason(fotaFarm.start(startTimeValue, accountsMap.validAccount1Option), "onlyMainAdmin")
      })

      it('start: wrong value', async () => {
        const startTimeValue = moment().add(100, 'd').unix()
        await fotaFarm.updateRewardingDays(999)

        await catchRevertWithReason(fotaFarm.start(startTimeValue), "FOTAFarm: must be earlier rewardingDays")
      })
      it('start: initialized', async () => {
        const startTimeValue = moment().subtract(1, 'd').startOf('d').unix()
        await fotaFarm.start(startTimeValue)
        await catchRevertWithReason(fotaFarm.start(startTimeValue), "FOTAFarm: startTime had been initialized")
      })
      it('rewardingDays: unauthorized', async () => {
        await catchRevertWithReason(fotaFarm.updateRewardingDays(1, accountsMap.validAccount1Option), "onlyMainAdmin")
      })
      it('rewardingDays: wrong value', async () => {
        await catchRevertWithReason(fotaFarm.updateRewardingDays(0), "FOTAFarm: days invalid")
      })
    })
  })
  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      beforeEach( async () => {
        fotaFarm = await contracts.initFOTAFarmInstance(accounts)
        const startTimeValue = moment().subtract(1, 'd').startOf('d').unix()
        await fotaFarm.start(startTimeValue)
      })
      it('Can fund FOTA', async () => {
        await fundFota(accountsMap.mainAdmin)
        await approveFota(accountsMap.mainAdmin)
        let currentDay = await fotaFarm.getDaysPassed()
        currentDay = currentDay.toNumber()
        let rewardingDays = await fotaFarm.rewardingDays()
        rewardingDays = rewardingDays.toNumber()
        const response = await fotaFarm.fundFOTA(value3BN)
        listenEvent(response, 'FOTAFunded')
        for(let i = 1; i <= rewardingDays; i++) {
          const dailyReward = await fotaFarm.dailyReward(currentDay + i)
          dailyReward.should.be.a.bignumber.that.equals(value1BN)
        }
      })
      it('Can farming by FOTA', async () => {
        let secondInADay = await fotaFarm.secondInADay()
        secondInADay = secondInADay.toNumber()
        // fund FOTA in day 0
        await fundFOTAToFarmAndMoveToTomorrow(secondInADay)
        // depositFOTA in day 1
        const user = accountsMap.user1
        await fundFota(user)
        await approveFota(user)
        const response = await fotaFarm.depositFOTA(value1000BN, accountsMap.validAccount1Option)
        listenEvent(response, 'FOTADeposited', 1)
        const farmer = await fotaFarm.farmers(user)
        const pointIndex = '2'
        farmer[pointIndex].should.be.a.bignumber.that.equals(value1000BN)

        let daysPassed = await fotaFarm.getDaysPassed()
        const userCheckedIn = await fotaFarm.checkinTracker(user, daysPassed.toNumber())
        userCheckedIn.should.be.true

        await catchRevertWithReason(fotaFarm.checkin(accountsMap.validAccount1Option), "FOTAFarm: checked in");

        // checkin on day 2
        await timerHelper.advanceTimeAndBlock(secondInADay)
        const checkinResponse = await fotaFarm.checkin(accountsMap.validAccount1Option)
        listenEvent(checkinResponse, 'CheckedIn')
        daysPassed = await fotaFarm.getDaysPassed()
        const userDailyCheckinPoint = await fotaFarm.getUserDailyCheckinPoint(user, daysPassed)
        userDailyCheckinPoint.should.be.a.bignumber.that.equals(farmer[pointIndex])
        const dailyCheckinPoint = await fotaFarm.dailyCheckinPoint(daysPassed)
        dailyCheckinPoint.should.be.a.bignumber.that.equals(farmer[pointIndex])
        const dailyRewardAtDay2 = await fotaFarm.dailyReward(daysPassed)
        // checkin on day 3
        await timerHelper.advanceTimeAndBlock(secondInADay)
        await fotaFarm.checkin(accountsMap.validAccount1Option)
        // miss claim on day 4
        await timerHelper.advanceTimeAndBlock(secondInADay)
        // claim on day 5
        await timerHelper.advanceTimeAndBlock(secondInADay)
        const fotaTokenInstance = await loadFotaInstance()
        let balanceBefore = await fotaTokenInstance.balanceOf(user)
        const claimResponse = await fotaFarm.claim(accountsMap.validAccount1Option)
        listenEvent(claimResponse, 'Claimed', claimResponse.logs.length - 1)
        let balanceAfter = await fotaTokenInstance.balanceOf(user)
        balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.add(dailyRewardAtDay2))

        daysPassed = await fotaFarm.getDaysPassed()
        daysPassed = daysPassed.toNumber()
        let rewardingDays = await fotaFarm.rewardingDays()
        rewardingDays = rewardingDays.toNumber()
        for(let i = 1; i <= rewardingDays; i++) {
          const dailyReward = await fotaFarm.dailyReward(daysPassed + i)
          dailyReward.toString().length.should.be.greaterThan(0)
        }
        // withdraw on day 6
        await timerHelper.advanceTimeAndBlock(secondInADay)
        daysPassed = await fotaFarm.getDaysPassed()
        daysPassed = daysPassed.toNumber()
        const dailyRewardForTodayClaim = await fotaFarm.dailyReward(daysPassed - rewardingDays)
        balanceBefore = await fotaTokenInstance.balanceOf(user)
        const withdrawResponse = await fotaFarm.withdraw(accountsMap.validAccount1Option)
        listenEvent(withdrawResponse, 'Withdrew', withdrawResponse.logs.length - 1)
        balanceAfter = await fotaTokenInstance.balanceOf(user)
        balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.add(dailyRewardForTodayClaim).add(value1000BN))
      })
      it('Pending reward would be moved when withdraw', async () => {
        let secondInADay = await fotaFarm.secondInADay()
        secondInADay = secondInADay.toNumber()
        // fund FOTA in day 0
        await fundFOTAToFarmAndMoveToTomorrow(secondInADay)
        // depositFOTA in day 1
        const user = accountsMap.user1
        await fundFota(user)
        await approveFota(user)
        const response = await fotaFarm.depositFOTA(value1000BN, accountsMap.validAccount1Option)
        listenEvent(response, 'FOTADeposited', 1)
        const farmer = await fotaFarm.farmers(user)
        const pointIndex = '2'
        farmer[pointIndex].should.be.a.bignumber.that.equals(value1000BN)

        let daysPassed = await fotaFarm.getDaysPassed()
        const userCheckedIn = await fotaFarm.checkinTracker(user, daysPassed.toNumber())
        userCheckedIn.should.be.true

        await catchRevertWithReason(fotaFarm.checkin(accountsMap.validAccount1Option), "FOTAFarm: checked in");

        // checkin on day 2
        await timerHelper.advanceTimeAndBlock(secondInADay)
        await fotaFarm.checkin(accountsMap.validAccount1Option)
        // checkin on day 3
        await timerHelper.advanceTimeAndBlock(secondInADay)
        await fotaFarm.checkin(accountsMap.validAccount1Option)
        // no checkin on day 4-5-6
        await timerHelper.advanceTimeAndBlock(secondInADay)
        await timerHelper.advanceTimeAndBlock(secondInADay)
        await timerHelper.advanceTimeAndBlock(secondInADay)
        // withdraw on day 7
        await timerHelper.advanceTimeAndBlock(secondInADay)
        await fotaFarm.withdraw(accountsMap.validAccount1Option)
        daysPassed = await fotaFarm.getDaysPassed()
        daysPassed = daysPassed.toNumber()
        let rewardingDays = await fotaFarm.rewardingDays()
        rewardingDays = rewardingDays.toNumber()
        for(let i = 1; i <= rewardingDays; i++) {
          const dailyReward = await fotaFarm.dailyReward(daysPassed + i)
          dailyReward.should.be.a.bignumber.that.equals(value1BN)
        }
      })
    })
    describe('B. Failed', async () => {
      beforeEach( async () => {
        fotaFarm = await contracts.initFOTAFarmInstance(accounts)
        const startTimeValue = moment().subtract(1, 'd').startOf('d').unix()
        await fotaFarm.start(startTimeValue)
      })
      it('Can not deposit/checkin 2 times / daysPassed', async () => {
        let secondInADay = await fotaFarm.secondInADay()
        secondInADay = secondInADay.toNumber()
        await fundFOTAToFarmAndMoveToTomorrow(secondInADay)
        const user = accountsMap.user1
        await fundFota(user)
        await approveFota(user)
        await fotaFarm.depositFOTA(value1000BN, accountsMap.validAccount1Option)
        await fundFota(user)
        await approveFota(user)

        await catchRevertWithReason(fotaFarm.checkin(accountsMap.validAccount1Option), 'FOTAFarm: checked in')
      })
    })
  })
})

async function fundFOTAToFarmAndMoveToTomorrow(secondInADay) {
  await fundFota(accountsMap.mainAdmin)
  await approveFota(accountsMap.mainAdmin)
  await fotaFarm.fundFOTA(value3BN)
  await timerHelper.advanceTimeAndBlock(secondInADay)
}

async function loadFotaInstance() {
  const fotaAddress = await fotaFarm.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function fundFota(user) {
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
  await fotaTokenInstance.releaseGameAllocation(user, value1000BN)
  const balance = await fotaTokenInstance.balanceOf(user)
  balance.should.be.a.bignumber.that.equals(value1000String)
}

async function approveFota(user) {
  const userOption = {
    from: user
  }
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.approve(fotaFarm.address, value1000BN, userOption)
  const allowance = await fotaTokenInstance.allowance(user, fotaFarm.address)
  allowance.should.be.a.bignumber.that.equals(value1000BN)
}
