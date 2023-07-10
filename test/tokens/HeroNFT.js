const contracts = require('../utils/contracts')
const {
  catchRevert
} = require('../utils/exceptions.js')
const { accountsMap, listenEvent, value1BN, value10BN, value1000BN, getTokenIdFromResponse, BN } = require('../utils')
let heroNFTInstance
const initClass = 1
const HERO_PRICE = value1BN
const OWN_PRICE = value1000BN
const newClass = 'newClass'
const newRace = 'newRace'
const newName = 'newName'
const strengths = [1, 2, 3, 4, 5, 6, 7]
const quantity = 10
let index = 0

contract('HeroNFT', async (accounts) => {
  before(async () => {
    heroNFTInstance = await contracts.initHeroNFTInstance(accounts, true)
    await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
  })
  describe('I. Success', () => {
	  it('update mint admin', async () => {
	    await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
      const _isMainAdmin = await heroNFTInstance._isMainAdmin(accountsMap.mainAdminOption)
      _isMainAdmin.should.be.true
    })
	  it('mint-able', async () => {
      const oldBalance = await heroNFTInstance.balanceOf(accountsMap.mainAdmin)
      const response = await heroNFTInstance.mintHero(accountsMap.mainAdmin, initClass, HERO_PRICE, index++)
      const newBalance = await heroNFTInstance.balanceOf(accountsMap.mainAdmin)
      newBalance.toNumber().should.be.equal(oldBalance.toNumber() + 1)
      listenEvent(response, 'Transfer')
      const { tokenId } = response.receipt.logs[0].args
      const owner = await heroNFTInstance.ownerOf(tokenId)
      owner.should.be.equal(accountsMap.mainAdmin)
     })
    it('mintHeroes', async () => {
	    await heroNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
      const oldBalance = await heroNFTInstance.balanceOf(accountsMap.mainAdmin)
      const response = await heroNFTInstance.mintHeroes(accountsMap.mainAdmin, initClass, HERO_PRICE, quantity)
      const newBalance = await heroNFTInstance.balanceOf(accountsMap.mainAdmin)
      newBalance.toNumber().should.be.equal(oldBalance.toNumber() + quantity)
      listenEvent(response, 'Transfer')
      const { tokenId } = response.receipt.logs[0].args
      const owner = await heroNFTInstance.ownerOf(tokenId)
      owner.should.be.equal(accountsMap.mainAdmin)
    })
    it('burnable', async () => {
      const mintingResponse = await heroNFTInstance.mintHero(accountsMap.mainAdmin, initClass, HERO_PRICE, index++)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      const oldBalance = await heroNFTInstance.balanceOf(accountsMap.mainAdmin)
      const response = await heroNFTInstance.burn(tokenId)
      const newBalance = await heroNFTInstance.balanceOf(accountsMap.mainAdmin)
      newBalance.toNumber().should.be.equal(oldBalance.toNumber() - 1)
      listenEvent(response, 'Transfer', 1)
      await catchRevert(heroNFTInstance.ownerOf(tokenId))
    })
    it('correct token info', async () => {
      await heroNFTInstance.updateGameContract(accountsMap.mainAdmin, true)
      for(let i = 1; i <= 1; i++) {
        const response = await heroNFTInstance.mintHero(accountsMap.mainAdmin, i, HERO_PRICE, index++)
        const { tokenId } = response.receipt.logs[0].args
        const hero = await heroNFTInstance.getHero(tokenId)
        const race = await heroNFTInstance.mappingHeroRace(i)
        hero['0'].toString().should.be.equal(race)
        hero['3'].toNumber().should.be.equal(i)
        hero['5'].toNumber().should.be.equal(1)
        hero['6'].toNumber().should.be.equal(0)
        const heroPrice = await heroNFTInstance.heroes(tokenId)
        heroPrice['4'].should.be.a.bignumber.that.equals(HERO_PRICE)

        const heroSkills = await heroNFTInstance.getHeroSkills(tokenId)
        heroSkills[0].toNumber().should.be.equal(1)
        heroSkills[1].toNumber().should.be.equal(0)
        heroSkills[2].toNumber().should.be.equal(0)
      }
    })
    it('set creator', async () => {
      await heroNFTInstance.setCreator(initClass, accountsMap.user1)
      const creator = await heroNFTInstance.creators(initClass)
      creator.should.be.equal(accountsMap.user1)
    })
    it('change creator', async () => {
      await heroNFTInstance.setCreator(initClass, accountsMap.user2)
      const creator = await heroNFTInstance.creators(initClass)
      creator.should.be.equal(accountsMap.user2)
    })
    it('updateBaseStrengths', async () => {
      for(let i = 2; i <= 18; i++) {
        const response = await heroNFTInstance.updateBaseStrengths(i, strengths)
        listenEvent(response, 'BaseStrengthUpdated')
        let strengthIndexReferences = await heroNFTInstance.getStrengthIndexReferences(i)
        strengthIndexReferences[0].toNumber().should.be.equal(strengths[0])
        strengthIndexReferences[1].toNumber().should.be.equal(strengths[1])
        strengthIndexReferences[2].toNumber().should.be.equal(strengths[2])
        strengthIndexReferences[3].toNumber().should.be.equal(strengths[3])
        strengthIndexReferences[4].toNumber().should.be.equal(strengths[4])
        strengthIndexReferences[5].toNumber().should.be.equal(strengths[5])
      }
    })
    it('updateStrengthBonus', async () => {
      for(let i = 2; i <= 18; i++) {
        const response = await heroNFTInstance.updateStrengthBonus(i, strengths)
        listenEvent(response, 'StrengthBonusUpdated')
        let strengthBonuses = await heroNFTInstance.getStrengthBonuses(i)
        strengthBonuses[0].toNumber().should.be.equal(strengths[0])
        strengthBonuses[1].toNumber().should.be.equal(strengths[1])
        strengthBonuses[2].toNumber().should.be.equal(strengths[2])
        strengthBonuses[3].toNumber().should.be.equal(strengths[3])
        strengthBonuses[4].toNumber().should.be.equal(strengths[4])
        strengthBonuses[5].toNumber().should.be.equal(strengths[5])
      }
    })
    it('updateExperienceCheckpoint', async () => {
      for(let i = 2; i <= 25; i++) {
        const response = await heroNFTInstance.updateExperienceCheckpoint(i, i * 1000)
        listenEvent(response, 'ExperienceCheckpointUpdated')
        let experienceCheckpoint = await heroNFTInstance.experienceCheckpoint(i)
        experienceCheckpoint.toNumber().should.be.equal(i * 1000)
      }
    })
    it('add new hero class', async () => {
      const oldCountId = await heroNFTInstance.countId()
      const response = await heroNFTInstance.addHeroClass(newRace, newClass, newName, strengths, accountsMap.user1)
      const newCountId = await heroNFTInstance.countId()
      newCountId.toNumber().should.be.equal(oldCountId.toNumber() + 1)
      const className = await heroNFTInstance.mappingHeroClass(newCountId)
      className.should.be.equal(newClass)
      const creator = await heroNFTInstance.creators(newCountId)
      creator.should.be.equal(accountsMap.user1)

      listenEvent(response, 'NewClassAdded', 0)
    })
    it('updateOwnPrice', async () => {
      const response = await heroNFTInstance.mintHero(accountsMap.mainAdmin, initClass, HERO_PRICE, index++)
      const { tokenId } = response.receipt.logs[0].args
      await heroNFTInstance.updateOwnPrice(tokenId, OWN_PRICE)
      const ownPrice = await heroNFTInstance.heroes(tokenId)
      const fotaOwnPrice = await heroNFTInstance.fotaOwnPrices(tokenId)
      ownPrice['4'].should.be.a.bignumber.that.equals(OWN_PRICE)
      fotaOwnPrice.should.be.a.bignumber.that.equals(OWN_PRICE)
    })
    it('skillUp, experienceUp & levelUp', async () => {
      for(let i = 1; i <= 26; i++) {
        await heroNFTInstance.updateExperienceCheckpoint(i, i * 1000)
      }
      const response = await heroNFTInstance.mintHero(accountsMap.mainAdmin, initClass, HERO_PRICE, index++)
      const tokenId = getTokenIdFromResponse(response)
      let hero = await heroNFTInstance.heroes(tokenId)
      hero.level.toNumber().should.be.equals(1)

      // to level 2
      const response2 = await heroNFTInstance.experienceUp([tokenId], [2000])
      listenEvent(response2, 'LevelUp', 0)
      listenEvent(response2, 'ExperienceUp', 1)
      hero = await heroNFTInstance.heroes(tokenId)
      hero.level.toNumber().should.be.equals(2)
      hero.experience.toNumber().should.be.equals(2000)

      // to level 5
      const response5 = await heroNFTInstance.experienceUp([tokenId], [3000])
      listenEvent(response5, 'LevelUp', 0)
      listenEvent(response5, 'SkillUp', 1)
      listenEvent(response5, 'ExperienceUp', 2)
      hero = await heroNFTInstance.heroes(tokenId)
      hero.level.toNumber().should.be.equals(5)
      hero.experience.toNumber().should.be.equals(5000)
      let skills = await heroNFTInstance.getHeroSkills(tokenId)
      skills[0].toNumber().should.be.equals(1)
      skills[1].toNumber().should.be.equals(1)
      skills[2].toNumber().should.be.equals(1)

      // to level 8
      const response8 = await heroNFTInstance.experienceUp([tokenId], [3000])
      listenEvent(response8, 'LevelUp', 0)
      listenEvent(response8, 'SkillUp', 1)
      listenEvent(response8, 'ExperienceUp', 2)
      hero = await heroNFTInstance.heroes(tokenId)
      hero.level.toNumber().should.be.equals(8)
      hero.experience.toNumber().should.be.equals(8000)
      skills = await heroNFTInstance.getHeroSkills(tokenId)
      skills[0].toNumber().should.be.equals(2)
      skills[1].toNumber().should.be.equals(2)
      skills[2].toNumber().should.be.equals(1)

      // to level 11
      const response11 = await heroNFTInstance.experienceUp([tokenId], [3000])
      listenEvent(response11, 'LevelUp', 0)
      listenEvent(response11, 'SkillUp', 1)
      listenEvent(response11, 'ExperienceUp', 2)
      hero = await heroNFTInstance.heroes(tokenId)
      hero.level.toNumber().should.be.equals(11)
      hero.experience.toNumber().should.be.equals(11000)
      skills = await heroNFTInstance.getHeroSkills(tokenId)
      skills[0].toNumber().should.be.equals(3)
      skills[1].toNumber().should.be.equals(2)
      skills[2].toNumber().should.be.equals(2)

      // to level 20
      const response20 = await heroNFTInstance.experienceUp([tokenId], [9000])
      listenEvent(response20, 'LevelUp', 0)
      listenEvent(response20, 'SkillUp', 1)
      listenEvent(response20, 'ExperienceUp', 2)
      hero = await heroNFTInstance.heroes(tokenId)
      hero.level.toNumber().should.be.equals(20)
      hero.experience.toNumber().should.be.equals(20000)
      skills = await heroNFTInstance.getHeroSkills(tokenId)
      skills[0].toNumber().should.be.equals(4)
      skills[1].toNumber().should.be.equals(4)
      skills[2].toNumber().should.be.equals(4)
    })
    it('updateHeroRace', async () => {
      const response = await heroNFTInstance.updateHeroRace(initClass, newRace)
      listenEvent(response, 'HeroRaceUpdated')
      const race = await heroNFTInstance.mappingHeroRace(initClass)
      race.should.be.equals(newRace)
    })
    it('updateHeroClass', async () => {
      const response = await heroNFTInstance.updateHeroClass(initClass, newClass)
      listenEvent(response, 'HeroClassUpdated')
      const klass = await heroNFTInstance.mappingHeroClass(initClass)
      klass.should.be.equals(newClass)
    })
    it('updateHeroName', async () => {
      const response = await heroNFTInstance.updateHeroName(initClass, 'the name')
      listenEvent(response, 'HeroNameUpdated')
      const name = await heroNFTInstance.mappingHeroName(initClass)
      name.should.be.equals('the name')
    })
    it ('updateLockedFromMKPStatus', async () => {
      const mintTokenResponse = await heroNFTInstance.mintHero(accountsMap.mainAdmin, initClass, HERO_PRICE, index++)
      const tokenId = getTokenIdFromResponse(mintTokenResponse)
      const response = await heroNFTInstance.updateLockedFromMKPStatus([tokenId], true)
      listenEvent(response, 'LockedFromMKPStatusUpdated')
    })
    it('airdrop', async () => {
      const response = await heroNFTInstance.airdrop(accountsMap.user1, 1, value1BN, 1)
      listenEvent(response, 'LockedFromMKPStatusUpdated', 1)
    })
  })
})
