const contracts = require('.././utils/contracts')
const HeroNFT = artifacts.require('.././HeroNFT.sol')
const { accountsMap, listenEvent, value1BN, value10BN, value50BN } = require('.././utils')
const { catchRevertWithReason } = require('.././utils/exceptions')

let launchPadInstance
let launchPadManagerInstance
let gallerLaunchPadHeroInstance1
let gallerLaunchPadHeroInstance2

contract('GallerLaunchPad', (accounts) => {
  describe('A. Success', async () => {
    before(async () => {
      const { launchPad, gallerLaunchPadHero1, gallerLaunchPadHero2, launchPadManager } = await contracts.initLaunchPadHeroInstance(accounts)
      launchPadInstance = launchPad
      gallerLaunchPadHeroInstance1 = gallerLaunchPadHero1
      gallerLaunchPadHeroInstance2 = gallerLaunchPadHero2
      launchPadManagerInstance = launchPadManager
    })
    it('can mint hero LaunchPadHeroInstance1', async () => {
      const heroInstance = await loadHeroInstance()
      const userBalanceBefore = await heroInstance.balanceOf(accountsMap.mainAdmin)
      const response = await launchPadInstance.mint(gallerLaunchPadHeroInstance1.address, 1, { value: value1BN })
      listenEvent(response, 'Mint')
      const userBalanceAfter = await heroInstance.balanceOf(accountsMap.mainAdmin)
      userBalanceAfter.toNumber().should.equal(userBalanceBefore.toNumber() + 1)
    })
    it('can mint max each time hero LaunchPadHeroInstance1', async () => {
      const heroInstance = await loadHeroInstance()
      const userBalanceBefore = await heroInstance.balanceOf(accountsMap.mainAdmin)
      const response = await launchPadInstance.mint(gallerLaunchPadHeroInstance1.address, 10, { value: value10BN })
      listenEvent(response, 'Mint')
      const userBalanceAfter = await heroInstance.balanceOf(accountsMap.mainAdmin)
      userBalanceAfter.toNumber().should.equal(userBalanceBefore.toNumber() + 10)
    })
    it('can mint max per user hero LaunchPadHeroInstance1', async () => {
      const heroInstance = await loadHeroInstance()
      const userBalanceBefore = await heroInstance.balanceOf(accountsMap.mainAdmin)
      const response = await launchPadInstance.mint(gallerLaunchPadHeroInstance1.address, 4, { value: value10BN })
      listenEvent(response, 'Mint')
      const userBalanceAfter = await heroInstance.balanceOf(accountsMap.mainAdmin)
      userBalanceAfter.toNumber().should.equal(userBalanceBefore.toNumber() + 4)
      await catchRevertWithReason(launchPadInstance.mint(gallerLaunchPadHeroInstance1.address, 4, { value: value10BN }), "reach max per address limit")
    })
    it('can mint hero LaunchPadHeroInstance2', async () => {
      const heroInstance = await loadHeroInstance()
      const userBalanceBefore = await heroInstance.balanceOf(accountsMap.user1)
      const response = await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 1, { value: value1BN, from: accountsMap.user1 })
      listenEvent(response, 'Mint')
      const userBalanceAfter = await heroInstance.balanceOf(accountsMap.user1)
      userBalanceAfter.toNumber().should.equal(userBalanceBefore.toNumber() + 1)
    })
    it('can mint max each time hero LaunchPadHeroInstance2', async () => {
      const heroInstance = await loadHeroInstance()
      const userBalanceBefore = await heroInstance.balanceOf(accountsMap.user1)
      const response = await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user1 })
      listenEvent(response, 'Mint')
      const userBalanceAfter = await heroInstance.balanceOf(accountsMap.user1)
      userBalanceAfter.toNumber().should.equal(userBalanceBefore.toNumber() + 20)
    })
    it('can mint max per user hero LaunchPadHeroInstance2', async () => {
      const heroInstance = await loadHeroInstance()
      const userBalanceBefore = await heroInstance.balanceOf(accountsMap.user1)
      const response = await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 9, { value: value10BN, from: accountsMap.user1 })
      listenEvent(response, 'Mint')
      const userBalanceAfter = await heroInstance.balanceOf(accountsMap.user1)
      userBalanceAfter.toNumber().should.equal(userBalanceBefore.toNumber() + 9)
      await catchRevertWithReason(launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 4, { value: value10BN, from: accountsMap.user1 }), "reach max per address limit")
    })
    it('should error when reach max total supply LaunchPadHeroInstance2', async () => {
      await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user2 })
      await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user3 })
      await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user4 })
      await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user5 })
      await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user6 })
      await launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 20, { value: value50BN, from: accountsMap.user7 })
      await catchRevertWithReason(launchPadInstance.mint(gallerLaunchPadHeroInstance2.address, 4, { value: value10BN, from: accountsMap.user8 }), "reach campaign max supply")
    })
  })
})

async function loadHeroInstance() {
  const heroAddress = await launchPadManagerInstance.heroNft()
  return HeroNFT.at(heroAddress)
}
