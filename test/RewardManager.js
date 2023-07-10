const HeroNFT = artifacts.require('./HeroNFT.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const Citizen = artifacts.require('./Citizen.sol')
const LandLordManager = artifacts.require('./LandLordManager.sol')
const LandNFT = artifacts.require('./LandNFT.sol')
const { listenEvent, accountsMap, value1BN, getAccounts, BN, value100BN, value500BN, value10BN, value150BN, value90BN, value1000BN,
  value1NegativeBN
} = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevert,
  catchRevertWithReason
} = require('./utils/exceptions.js')
const timerHelper = require('./utils/timer')
const { HERO_PRICE } = require('./utils/dataHolder')

let rewardManagerInstance
const mission1 = 1
const initClass = 1

contract('RewardManager', (accounts) => {
  describe('I. User functions', async () => {
    describe('A. Success', async () => {
      getAccounts(accounts)
      beforeEach(async () => {
        rewardManagerInstance = await contracts.initRewardManagerInstance(accounts, true)
      })
      it('can add PVE reward', async () => {
        await addPVEReward(true)
      })
      it('can add PVP reward', async () => {
        await addPVPReward(true)
      })
      it('can claim', async () => {
        await addPVEReward()
        const dayPassed = await rewardManagerInstance.getDaysPassed()
        console.log('dayPassed', dayPassed.toNumber())
        const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)
        const secondInADay = await rewardManagerInstance.secondInADay()
        const rewardingDays = await rewardManagerInstance.rewardingDays()
        await timerHelper.advanceTimeAndBlock(secondInADay.toNumber() * rewardingDays.toNumber())
        await mintHeroes(2)
        await rewardManagerInstance.claim(accountsMap.validAccount1Option)
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can finish game pve and claim - no daily quest', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(5, 0, 0)
        const { userDailyPending } = await addPVERewardAndClaim()
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)

        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can finish game pve and claim - has daily quest', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(0, 0, 0)
        const { reward, userDailyPending } = await addPVERewardAndClaim()
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        const dailyQuestReward = await rewardManagerInstance.dailyQuestReward()
        const event = reward.logs[0].args
        const { farmShareAmount, referralShareAmount, landLordShareAmount } = event
        const newUserShare = value1BN.sub(farmShareAmount).sub(referralShareAmount).sub(landLordShareAmount).add(dailyQuestReward)

        newUserShare.should.be.a.bignumber.that.equals(userDailyPending)
        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can distribution of pending bonuses from the game PVE - no daily quest', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(5, 0, 0)
        const heroIds = await mintHeroes(3)
        const reward = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const dayPassed = await rewardManagerInstance.getDaysPassed()
        const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)
        const event = reward.logs[0].args
        const { farmShareAmount, referralShareAmount, landLordShareAmount } = event
        const newUserShare = value1BN.sub(farmShareAmount).sub(referralShareAmount).sub(landLordShareAmount)

        newUserShare.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can distribution of pending bonuses from the game PVE - has daily quest', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(0, 0, 0)
        const heroIds = await mintHeroes(3)
        const addReward = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const dayPassed = await rewardManagerInstance.getDaysPassed()
        const dailyQuestReward = await rewardManagerInstance.dailyQuestReward()
        const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)
        const event = addReward.logs[0].args
        const { farmShareAmount, referralShareAmount, landLordShareAmount } = event
        const newUserShare = value1BN.sub(farmShareAmount).sub(referralShareAmount).sub(landLordShareAmount).add(dailyQuestReward)

        newUserShare.should.be.a.bignumber.that.equals(userDailyPending)
      })
      //
      it('should rewardPending per day not greater than userMaxPendingPerDay', async () => {
        const heroIds = await mintHeroes(3)
        await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value100BN, heroIds)
        await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1000BN, heroIds)
        const dayPassed = await rewardManagerInstance.getDaysPassed()
        const userMaxPendingPerDay = await rewardManagerInstance.userMaxPendingPerDay()
        const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)

        userDailyPending.should.be.a.bignumber.that.equals(userMaxPendingPerDay)
      })
      //
      it('can update daily quest condition', async () => {
        const questCondition = new BN(`1`)
        const pveWinDailyQuestCondition = questCondition;
        const pvpWinDailyQuestCondition = questCondition;
        const dualWinDailyQuestCondition = questCondition;
        const response = await rewardManagerInstance.updateDailyQuestCondition(
          pveWinDailyQuestCondition,
          pvpWinDailyQuestCondition,
          dualWinDailyQuestCondition
        )
        const event = response.logs[0].args
        const { pve, pvp, dual } = event

        pve.should.be.a.bignumber.that.equals(pveWinDailyQuestCondition)
        pvp.should.be.a.bignumber.that.equals(pvpWinDailyQuestCondition)
        dual.should.be.a.bignumber.that.equals(dualWinDailyQuestCondition)
      })

      it('can not pass to claim daily quest - pve pass, pvp & dual not pass ', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(0, 5, 5)
        const heroIds = await mintHeroes(3)
        const response = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const event = response.logs[0].args
        const { userShare, farmShareAmount, referralShareAmount, landLordShareAmount } = event
        const newUserShare = value1BN.sub(farmShareAmount).sub(referralShareAmount).sub(landLordShareAmount)

        newUserShare.should.be.a.bignumber.that.equals(userShare)
      })

      it('can not pass to claim daily quest - pve & pvp pass, dual not pass', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(0, 0, 5)
        const heroIds = await mintHeroes(3)
        const response = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const event = response.logs[0].args
        const { userShare, farmShareAmount, referralShareAmount, landLordShareAmount } = event
        const newUserShare = value1BN.sub(farmShareAmount).sub(referralShareAmount).sub(landLordShareAmount)

        newUserShare.should.be.a.bignumber.that.equals(userShare)
      })

      it('can not pass to claim daily quest - pve, pvp, dual pass', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(0, 0, 0)
        const heroIds = await mintHeroes(3)
        const response = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const dailyQuestReward = await rewardManagerInstance.dailyQuestReward()
        const event = response.logs[0].args
        const { userShare, farmShareAmount, referralShareAmount, landLordShareAmount } = event
        const newUserShare = value1BN.sub(farmShareAmount).sub(referralShareAmount).sub(landLordShareAmount).add(dailyQuestReward)

        newUserShare.should.be.a.bignumber.that.equals(userShare)
      })
      //
      it('can pass daily quest condition & received only 1 time', async () => {
        await rewardManagerInstance.updateDailyQuestCondition(0, 0, 0)
        const heroIds = await mintHeroes(3)
        const response = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const response1 = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const dailyQuestReward = await rewardManagerInstance.dailyQuestReward()
        const event1 = response.logs[0].args
        const event2 = response1.logs[0].args

        const newUserShare1 = value1BN
          .sub(event1.farmShareAmount)
          .sub(event1.referralShareAmount)
          .sub(event1.landLordShareAmount)
          .add(dailyQuestReward)
        const newUserShare2 = value1BN
          .sub(event2.farmShareAmount)
          .sub(event2.referralShareAmount)
          .sub(event2.landLordShareAmount)

        newUserShare1.should.be.a.bignumber.that.equals(event1.userShare)
        newUserShare2.should.be.a.bignumber.that.equals(event2.userShare)
      })
      //
      it('can claim after n day pending', async () => {
        const heroIds = await mintHeroes(3)
        await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
        const dayPassed = await rewardManagerInstance.getDaysPassed()
        const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)
        const secondInADay = await rewardManagerInstance.secondInADay()
        const rewardingDays = await rewardManagerInstance.rewardingDays()
        await timerHelper.advanceTimeAndBlock(secondInADay.toNumber() * rewardingDays.toNumber())
        await mintHeroes(2)
        await rewardManagerInstance.claim(accountsMap.validAccount1Option)
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)

        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can distribute amount after claim - for user, inviter, landLord, farm', async () => {
        const landLordInstance = await loadLandLordManagerInstance()
        const landNFTAddress = await landLordInstance.landNFT()
        const landNftInstance = await LandNFT.at(landNFTAddress)
        await landNftInstance.updateMintAdmin(landLordInstance.address, true)
        await landLordInstance.setFoundingPrice(1, value1BN)
        const fotaTokenInstance = await loadFotaInstance()
        await fundFota(accountsMap.user2)
        await fotaTokenInstance.approve(landLordInstance.address, value1BN, accountsMap.validAccount2Option)
        await landLordInstance.takeFounding(1, 0, accountsMap.validAccount2Option)

        const citizenInstance = await loadCitizenInstance()
        const inviterAddress = await citizenInstance.getInviter(accountsMap.user1)
        const { reward } = await addPVERewardAndClaim(true)

        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        const inviterBalance = await fotaTokenInstance.balanceOf(inviterAddress)
        const landInfo = await landLordInstance.lands(1)
        const landLordBalance = await landInfo.pendingReward
        const farmBalance = await fotaTokenInstance.balanceOf(await rewardManagerInstance.farm())
        const event = reward.logs[0].args

        userBalance.should.be.a.bignumber.that.equals(event.userShare)
        inviterBalance.should.be.a.bignumber.that.equals(event.referralShareAmount)
        landLordBalance.should.be.a.bignumber.that.equals(event.landLordShareAmount)
        farmBalance.should.be.a.bignumber.that.equals(event.farmShareAmount)
      })

      // TODO re-check landlord
      // it('can distribute amount after claim - for inviter has >= 2 F1, landLord & farm > 2 users', async () => {
      //   const citizenInstance = await loadCitizenInstance()
      //   citizenInstance.updateInviter([accountsMap.user1, accountsMap.user2], accountsMap.user3)
      //   // const heroIds = await mintHeroes(3)
      //   // await rewardManagerInstance.addPVEReward(mission1, accountsMap.user2, value1BN, heroIds)
      //   const { reward } = await addPVERewardAndClaim()
      //   const fotaTokenInstance = await loadFotaInstance()
      //   const landLordInstance = await loadLandLordManagerInstance()
      //   const inviterAddress = await citizenInstance.getInviter(accountsMap.user1)
      //   const landLordAddress = (await landLordInstance.lands(mission1)).landLord
      //
      //   const inviterBalance = await fotaTokenInstance.balanceOf(inviterAddress)
      //   const landLordBalance = await fotaTokenInstance.balanceOf(landLordAddress)
      //   const farmBalance = await fotaTokenInstance.balanceOf(await rewardManagerInstance.farm())
      //   const event = reward.logs[0].args
      //
      //   inviterBalance.should.be.a.bignumber.that.equals(event.referralShareAmount)
      //   landLordBalance.should.be.a.bignumber.that.equals(event.landLordShareAmount)
      //   farmBalance.should.be.a.bignumber.that.equals(event.farmShareAmount)
      // })
      //
      it('can distribute amount after claim - if not have inviter ', async () => {
        const { reward } = await addPVERewardAndClaim()
        const fotaTokenInstance = await loadFotaInstance()
        const citizenInstance = await loadCitizenInstance()
        await rewardManagerInstance.updateTreasuryAddress(accountsMap.user3)
        const inviterAddress = await citizenInstance.getInviter(accountsMap.user1)

        const treasuryBalance = await fotaTokenInstance.balanceOf(inviterAddress)
        const event = reward.logs[0].args

        inviterAddress.should.be.equals(accountsMap.zeroAddress)
        treasuryBalance.should.be.a.bignumber.that.equals(event.referralShareAmount)
      })

      it('can claim token condition - hero = minHero', async () => {
        await rewardManagerInstance.updateClaimCondition(2, [2, 5], [value100BN, value150BN], value100BN, value500BN)
        const { userDailyPending } = await addPVERewardAndClaim()
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)

        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can claim token condition - hero > minHero', async () => {
        await rewardManagerInstance.updateClaimCondition(2, [2, 5], [value100BN, value150BN], value100BN, value500BN)
        const heroIds = await mintHeroes(4)
        await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value100BN, heroIds)
        const dayPassed = await rewardManagerInstance.getDaysPassed()
        const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)
        await claim()
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)

        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can claim token condition - reward < maxReward', async () => {
        await rewardManagerInstance.updateClaimCondition(2, [2, 5], [value100BN, value150BN], value100BN, value500BN)
        const { userDailyPending } = await addPVERewardAndClaim()
        const fotaTokenInstance = await loadFotaInstance()
        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)

        userBalance.should.be.a.bignumber.that.equals(userDailyPending)
      })

      it('can claim token condition - reward close to maximum touch maxReward', async () => {
        await rewardManagerInstance.updateClaimCondition(2, [2, 5], [value100BN, value150BN], value100BN, value500BN)
        const { reward: reward1 } = await addPVERewardAndClaim(false, value90BN, accountsMap.user1)
        const { reward: reward2 } = await addPVERewardAndClaim(false, value90BN, accountsMap.user1)
        await claim(accountsMap.user1)
        const fotaTokenInstance = await loadFotaInstance()
        const citizenInstance = await loadCitizenInstance()
        const landLordInstance = await loadLandLordManagerInstance()
        const inviterAddress = await citizenInstance.getInviter(accountsMap.user1)
        const landLordAddress = (await landLordInstance.lands(mission1)).landLord

        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        const inviterBalance = await fotaTokenInstance.balanceOf(inviterAddress)
        const landLordBalance = await fotaTokenInstance.balanceOf(landLordAddress)
        const farmBalance = await fotaTokenInstance.balanceOf(await rewardManagerInstance.farm())
        const event1 = reward1.logs[0].args
        const event2 = reward2.logs[0].args

        inviterBalance.should.be.a.bignumber.that.equals(event1.referralShareAmount.add(event2.referralShareAmount))
        landLordBalance.should.be.a.bignumber.that.equals(event1.landLordShareAmount.add(event2.landLordShareAmount))
        farmBalance.should.be.a.bignumber.that.equals(event1.farmShareAmount.add(event2.farmShareAmount))
        userBalance.should.be.a.bignumber.that.equals(value100BN)
      })
    })

    describe('B. Failed', async () => {
      getAccounts(accounts)
      beforeEach(async () => {
        rewardManagerInstance = await contracts.initRewardManagerInstance(accounts, true)
      })

      it('can not claim after n day pending', async () => {
        await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN)
        const dayPassed = await rewardManagerInstance.getDaysPassed()
      await mintHeroes(2)
        await catchRevertWithReason(
          rewardManagerInstance.claim(accountsMap.validAccount1Option),
          'RewardManager: you have no reward to claim today'
        )
      })

      it('can not claim token condition - hero < minHero', async () => {
        await rewardManagerInstance.updateClaimCondition(3, [2, 5], [value100BN, value150BN], value100BN, value500BN)
        await addPVERewardAndClaim(false)
        await catchRevertWithReason(rewardManagerInstance.claim(), 'RewardManager: invalid hero condition')
      })

      it('can not claim when user blocked', async () => {
        await addPVERewardAndClaim(false)
        await rewardManagerInstance.updateBlockedUser(accountsMap.user1, true)
        await catchRevertWithReason(rewardManagerInstance.claim(
          accountsMap.validAccount1Option),
          `RewardManager: you can't do this now`
        )
      })

      it('can not claim when user forget claim', async () => {
        await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN)
        const secondInADay = await rewardManagerInstance.secondInADay()
        const rewardingDays = await rewardManagerInstance.rewardingDays()
        await timerHelper.advanceTimeAndBlock(secondInADay.toNumber())
        const reward = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value10BN)
        await timerHelper.advanceTimeAndBlock(secondInADay.toNumber() * rewardingDays.toNumber())
        await mintHeroes(2)
        await rewardManagerInstance.claim(accountsMap.validAccount1Option)

        const fotaTokenInstance = await loadFotaInstance()
        const landLordInstance = await loadLandLordManagerInstance()
        const citizenInstance = await loadCitizenInstance()
        const inviterAddress = await citizenInstance.getInviter(accountsMap.user1)
        const landLordAddress = (await landLordInstance.lands(mission1)).landLord

        const userBalance = await fotaTokenInstance.balanceOf(accountsMap.user1)
        const inviterBalance = await fotaTokenInstance.balanceOf(inviterAddress)
        const landLordBalance = await fotaTokenInstance.balanceOf(landLordAddress)
        const farmBalance = await fotaTokenInstance.balanceOf(await rewardManagerInstance.farm())
        const event = reward.logs[0].args

        userBalance.should.be.a.bignumber.that.equals(event.userShare)
        inviterBalance.should.be.a.bignumber.that.equals(event.referralShareAmount)
        landLordBalance.should.be.a.bignumber.that.equals(event.landLordShareAmount)
        farmBalance.should.be.a.bignumber.that.equals(event.farmShareAmount)
      })

      it('can not claim two time per day', async () => {
        await addPVERewardAndClaim(true)
        catchRevertWithReason(
          rewardManagerInstance.claim(accountsMap.validAccount1Option),
          'RewardManager: see you next time'
        )
      })
    })
  })
})

async function addPVERewardAndClaim(isClaim = true,  value = value1BN, account = accountsMap.user1) {
  const heroIds = await mintHeroes(3)
  const reward = await rewardManagerInstance.addPVEReward(mission1, account, value, heroIds)
  const dayPassed = await rewardManagerInstance.getDaysPassed()
  const userDailyPending = await rewardManagerInstance.userDailyPending(account, dayPassed)

  if (isClaim) {
    await claim(account)
  }

  return { reward, userDailyPending }
}

async function claim(account = accountsMap.user1) {
  const secondInADay = await rewardManagerInstance.secondInADay()
  const rewardingDays = await rewardManagerInstance.rewardingDays()
  await timerHelper.advanceTimeAndBlock(secondInADay.toNumber() * rewardingDays.toNumber())
  await rewardManagerInstance.claim({ from: account })
}

async function addPVEReward(test = false) {
  const heroIds = await mintHeroes(3)
  const response = await rewardManagerInstance.addPVEReward(mission1, accountsMap.user1, value1BN, heroIds)
  if (test) {
    listenEvent(response, 'UserRewardChanged')
    const dayPassed = await rewardManagerInstance.getDaysPassed()
    // console.log('dayPassed', dayPassed.toNumber())
    const userDailyPending = await rewardManagerInstance.userDailyPending(accountsMap.user1, dayPassed)
    // console.log('userDailyPending', userDailyPending.toString())
    // console.log('response', response.logs[0].args)
  }
}

async function addPVPReward(test = false) {
  await rewardManagerInstance.addPVPReward(accountsMap.user1, value1000BN)
  const response = await rewardManagerInstance.addPVPReward(accountsMap.user1, value1NegativeBN)
  if (test) {
    listenEvent(response, 'UserRewardChanged')
    const userReward = await rewardManagerInstance.userRewards(accountsMap.user1)
    userReward.should.be.a.bignumber.that.is.equal(value1000BN.add(value1NegativeBN))
    console.log('userReward', userReward.toString())
  }
}

async function loadHeroInstance() {
  const heroAddress = await rewardManagerInstance.heroNft()
  return HeroNFT.at(heroAddress)
}

async function loadFotaInstance() {
  const fotaAddress = await rewardManagerInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function loadCitizenInstance() {
  const citizenAddress = await rewardManagerInstance.citizen()
  return Citizen.at(citizenAddress)
}

async function loadLandLordManagerInstance() {
  const landLordManagerAddress = await rewardManagerInstance.landLordManager()
  return LandLordManager.at(landLordManagerAddress)
}

async function mintHeroes(quantity) {
  const heroNFTInstance = await loadHeroInstance()
  await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
  const response = await heroNFTInstance.mintHeroes(accountsMap.user1, initClass, HERO_PRICE, quantity)
  const tokenIds = []
  for (let log of response.logs) {
    tokenIds.push(log.args.tokenId)
  }
  return tokenIds
}

async function fundFota(user) {
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.releaseGameAllocation(user, value1BN)
}
