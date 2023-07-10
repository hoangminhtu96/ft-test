const HeroNFT = artifacts.require('./HeroNFT.sol')
const contracts = require('./utils/contracts')
const {HERO_PRICE} = require('./utils/dataHolder')
const {getTokenIdFromResponse, listenEvent, accountsMap} = require('./utils')
const timerHelper = require('./utils/timer')

const initClass = 1

let energyManagerInstance
let heroNFTInstance

contract('EnergyManager', (accounts) => {
  describe('A.Success', async () => {
    beforeEach(async () => {
      energyManagerInstance = await contracts.initEnergyManagerInstance(accounts, false)
      heroNFTInstance = await loadHeroNFTInstance()
      await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
    })
    it('Should have energy', async () => {
      await prepare(accountsMap.user1)
      let secondInADay = await energyManagerInstance.secondInADay()
      await timerHelper.advanceTimeAndBlock(secondInADay)
      await energyManagerInstance.updateEnergy(accountsMap.user1, 1)
    })
  })
})

async function prepare(user) {
  await heroNFTInstance.mintHero(user, initClass, HERO_PRICE, 0)
}

async function loadHeroNFTInstance() {
  const nftAddress = await energyManagerInstance.heroNft()
  return HeroNFT.at(nftAddress)
}

