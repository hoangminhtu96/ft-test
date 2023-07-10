const util = require('./utils')
const contracts = require('./utils/contracts')
const {
  catchRevert
} = require('./utils/exceptions.js')
let citizenInstance
const userName = 'USERNAME'
contract('Citizen', (accounts) => {
  beforeEach(async () => {
    citizenInstance= await contracts.initCitizenInstance(accounts)
    await citizenInstance.setWhiteList(util.accountsMap.mainAdmin, true)
  })
  describe('I. Success', async () => {
    it('1. register', async () => {
      const response = await citizenInstance.register(userName, util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option)
      util.listenEvent(response, 'Registered')
      const isCitizen = await citizenInstance.isCitizen(util.accountsMap.user1)
      isCitizen.should.be.true
    })
    it('2. invite other', async () => {
      await citizenInstance.register(userName, util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option)
      await citizenInstance.register(userName + '2', util.accountsMap.user1, util.accountsMap.validAccount2Option)
      const inviter = await citizenInstance.getInviter(util.accountsMap.user2)
      inviter.should.be.equal(util.accountsMap.user1)
    })
    it('3. Can sys residents', async () => {
      const residents = []
      const ids = []
      const userNames = []
      const inviters = [util.accountsMap.mainAdmin]
      for(let i = 1; i <= 10; i++) {
        residents.push(util.accountsMap[`user${i}`])
        ids.push(i)
        userNames.push(`USER${i}`)
        if (i > 1) {
          inviters.push(util.accountsMap[`user${i - 1}`])
        }
      }
      const response = await citizenInstance.syncResidents(residents, ids, userNames, inviters)
      console.log('gas used', response.receipt.gasUsed)
      for(let i = 2; i <= 10; i++) {
        const user = await citizenInstance.residents(util.accountsMap[`user${i}`])
        user.id.toNumber().should.equal(i)
        user.userName.should.equal(`USER${i}`)
        user.inviter.should.equal(util.accountsMap[`user${i - 1}`])
      }
    })
	})
  describe('II. Fail', async () => {
    it('1. invalid userName', async () => {
      await catchRevert(citizenInstance.register('0INVALID', util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option))
      await catchRevert(citizenInstance.register('INV', util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option))
      await catchRevert(citizenInstance.register('1234567891234567891234', util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option))
      await catchRevert(citizenInstance.register('INV@LID', util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option))
    })
    it('2. duplicate userName', async () => {
      await citizenInstance.register(userName, util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option)
      await catchRevert(citizenInstance.register(userName, util.accountsMap.mainAdmin, util.accountsMap.validAccount2Option))
    })
    it('3. duplicate address', async () => {
      await citizenInstance.register(userName, util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option)
      await catchRevert(citizenInstance.register(userName + '1', util.accountsMap.mainAdmin, util.accountsMap.validAccount1Option))
    })
    it('3. invalid inviter: not exists', async () => {
      await catchRevert(citizenInstance.register(userName, util.accountsMap.user2))
    })
    it('4. invalid inviter: invite himself', async () => {
      await catchRevert(citizenInstance.register(userName, util.accountsMap.mainAdmin))
    })
  })
})
