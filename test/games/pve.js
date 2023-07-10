const moment = require('moment')
const FOTAToken = artifacts.require('.././FOTAToken.sol')
const HeroNFT = artifacts.require('.././HeroNFT.sol')
const contracts = require('.././utils/contracts')
const {accountsMap, listenEvent, value1BN, value3BN, value1000BN, value1000String, BN } = require('.././utils')
const {catchRevertWithReason} = require('.././utils/exceptions')
const timerHelper = require('.././utils/timer')
const { HERO_PRICE } = require('../utils/dataHolder')
const async = require('async')
const messageSigner = require('../utils/messageSigner')
const send = require('send')
const utils = require('../utils')

let pveInstance
let heroNFTInstance
const mainReward = value3BN
const subReward = value1BN
const experience = 123
const energyConsumption = 2
const maxReward = value1000BN
const extraMissionWhenRunOutOfEnergyRatio = 2
const initClass = 1

contract('PVE', (accounts) => {
  before(() => {
    const adminAddress = messageSigner.getAddressFromPrivateKey(process.env.PRIVATE_KEY_ADMIN_FOR_TEST)
    const {
      mainAdmin,
    } = utils.getAccounts(accounts)
    if (adminAddress.toLowerCase() !== mainAdmin.toLowerCase()) {
      console.log('please update PRIVATE_KEY_ADMIN_FOR_TEST in .env with first key from ganache-cli'.red)
      exit(1)
    }
  })
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach( async () => {
        pveInstance = await contracts.initPVEInstance(accounts)
      })
      // it('addMission', async () => {
      //   const oldTotalMission = await pveInstance.totalMissions()
      //   const response = await pveInstance.addMission(mainReward, subReward, experience, accountsMap.contractAdmin)
      //   const newTotalMission = await pveInstance.totalMissions()
      //   listenEvent(response, 'MissionAdded')
      //   newTotalMission.should.be.a.bignumber.that.equals(oldTotalMission.add(new BN('1')))
      // })
      // it('updateMission', async () => {
      //   const index = 1
      //   const response = await pveInstance.updateMission(index, mainReward, subReward, experience, accountsMap.contractAdmin)
      //   listenEvent(response, 'MissionUpdated')
      //   response.logs[0].args.id.toNumber().should.equal(index)
      //   response.logs[0].args.mainReward.should.be.a.bignumber.that.equal(mainReward)
      //   response.logs[0].args.subReward.should.be.a.bignumber.that.equal(subReward)
      //   response.logs[0].args.experience.toNumber().should.equal(experience)
      //   response.logs[0].args.owner.should.equal(accountsMap.contractAdmin)
      //   const mission = await pveInstance.missions(index)
      //   mission.id.toNumber().should.equal(index)
      //   mission.mainReward.should.be.a.bignumber.that.equal(mainReward)
      //   mission.subReward.should.be.a.bignumber.that.equal(subReward)
      //   mission.experience.toNumber().should.equal(experience)
      //   mission.owner.should.equal(accountsMap.contractAdmin)
      // })
      // it('updateEnergyConsumption', async () => {
      //   const response = await pveInstance.updateEnergyConsumption(energyConsumption)
      //   listenEvent(response, 'EnergyConsumptionUpdated')
      //   response.logs[0].args.energyConsumption.toNumber().should.equal(energyConsumption)
      //   const newEnergyConsumption = await pveInstance.energyConsumption()
      //   newEnergyConsumption.toNumber().should.be.equal(energyConsumption)
      // })
      // it('updateMaxReward', async () => {
      //   const response = await pveInstance.updateMaxReward(maxReward)
      //   listenEvent(response, 'MaxRewardUpdated')
      //   response.logs[0].args.maxReward.should.be.a.bignumber.that.equal(maxReward)
      //   const newMaxReward = await pveInstance.maxReward()
      //   newMaxReward.should.be.a.bignumber.that.equal(maxReward)
      // })
      // it('updateExtraMissionWhenRunOutOfEnergyRatio', async () => {
      //   const response = await pveInstance.updateExtraMissionWhenRunOutOfEnergyRatio(extraMissionWhenRunOutOfEnergyRatio)
      //   listenEvent(response, 'ExtraMissionWhenRunOutOfEnergyRatioUpdated')
      //   response.logs[0].args.ratio.toNumber().should.equal(extraMissionWhenRunOutOfEnergyRatio)
      //   const newExtraMissionWhenRunOutOfEnergyRatio = await pveInstance.extraMissionWhenRunOutOfEnergyRatio()
      //   newExtraMissionWhenRunOutOfEnergyRatio.toNumber().should.be.equal(extraMissionWhenRunOutOfEnergyRatio)
      // })
    })
  })
  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        pveInstance = await contracts.initPVEInstance(accounts)
        await pveInstance.updateEnergyConsumption(1, 0)
        heroNFTInstance = await loadHeroInstance()
        await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
      })
      it('Can sync data', async () => {
        const heroIds = await mintHeroes(3)
        let energies = []
        let experiences = []
        let profits = []
        for (let i = 0; i < heroIds.length; i++) {
          energies.push(1)
          experiences.push(1)
          profits.push(1)
        }
        const heroData = [
          heroIds,
          energies,
          profits,
          []
        ]
        let totalValue = 0
        for (let i = 0; i < energies.length; i++) {
          totalValue += (heroIds[i].toNumber() + energies[i])
        }
        await syncData(heroData, experiences, totalValue)
      })
    })
  })
})

async function loadHeroInstance() {
  const heroAddress = await pveInstance.heroNft()
  return HeroNFT.at(heroAddress)
}

async function genSignature(user, totalValue) {
  let nonce = await pveInstance.nonces(user)
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const signature = messageSigner.signMessageFinishGame(pveInstance.address, {
    user,
    nonce: nonce.toNumber(),
    totalValue,
    timestamp
  })
  return {
    signature,
    timestamp
  }
}

async function mintHeroes(quantity) {
  const mintHeroResponse = await heroNFTInstance.mintHeroes(accountsMap.user1, initClass, HERO_PRICE, quantity)
  const heroIds = []
  for (let i = 0; i <  mintHeroResponse.receipt.logs.length; i++) {
    heroIds.push(mintHeroResponse.receipt.logs[i].args.tokenId)
  }
  return heroIds
}

async function syncData(heroData, experiences, totalValue) {
  const { signature, timestamp } = await genSignature(accountsMap.user1, totalValue)
  const missionInfo = await pveInstance.missions(1)
  await heroNFTInstance.setApprovalForAll(pveInstance.address, true, accountsMap.validAccount1Option)
  const data = [missionInfo.mainReward, 1, missionInfo.mainReward, missionInfo.mainReward, 1, timestamp, 1, missionInfo.mainReward]
  const revokedHeroes = []
  const response = await pveInstance.syncData(heroData, experiences, data, signature, revokedHeroes, 0, accountsMap.validAccount1Option)
  listenEvent(response, 'GameDataSynced')
  console.log('response', response.receipt.gasUsed)
  await finish2(heroData, experiences, missionInfo, totalValue)
  // await finish3(mission, heroIds, itemIds)
}

async function finish2(heroData, experiences, missionInfo, totalValue) {
  const { signature, timestamp } = await genSignature(accountsMap.user1, totalValue)
  const data = [missionInfo.mainReward, 1, missionInfo.mainReward, missionInfo.mainReward, 1, timestamp, 1, missionInfo.mainReward]
  const revokedHeroes = []
  const response2 = await pveInstance.syncData(heroData, experiences, data, signature, revokedHeroes, 0, accountsMap.validAccount1Option)
  console.log('response2', response2.receipt.gasUsed)
}

// async function finish3(mission, heroIds, itemIds) {
//   const { signature, timestamp } = await genSignature(accountsMap.user1, mission, heroIds)
//   const response3 = await pveInstance.syncData(mission, heroIds, signature, timestamp, accountsMap.validAccount1Option)
//   console.log('response3', response3.receipt.gasUsed)
// }
