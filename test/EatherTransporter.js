const ITemNFT = artifacts.require('./ITemNFT.sol')
const { listenEvent, accountsMap, value100BN } = require('./utils')
const contracts = require('./utils/contracts')
const { catchRevert, catchRevertWithReason } = require('./utils/exceptions')

let eatherTransporterInstance
const FORMULA_GENE = 0
const NORMAL_GENE = 1
const FORMULA_CLASS = 0
const NORMAL_CLASS = 101
const ITEM_PRICE = value100BN

contract('EatherTransporter', (accounts) => {
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        eatherTransporterInstance = await contracts.initEatherTransporterInstance(accounts)
      })
      it('Update openEather', async () => {
        const currentValue = await eatherTransporterInstance.openEather()
        const response = await eatherTransporterInstance.updateOpenEather(!currentValue)
        listenEvent(response, 'OpenEatherUpdated')
        const newValue = await eatherTransporterInstance.openEather()
        newValue.should.equal(!currentValue)
      })
    })
    describe('B. Fail', async () => {
      it('Update openEather: unauthorized', async () => {
        await catchRevertWithReason(eatherTransporterInstance.updateOpenEather(true, { from: accountsMap.user1 }), "onlyMainAdmin")
      })
    })
  })
  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        eatherTransporterInstance = await contracts.initEatherTransporterInstance(accounts)
      })
      it('Can transfer eather token when allowed', async () => {
        await eatherTransporterInstance.updateOpenEather(true)
        const itemNFTInstance = await loadItemInstance()
        await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        const user = accountsMap.user1
        const eatherMintingResponse = await itemNFTInstance.mintItem(user, FORMULA_GENE, FORMULA_CLASS, ITEM_PRICE, 0)
        await itemNFTInstance.updateMintAdmin(eatherTransporterInstance.address, true)
        const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
        await itemNFTInstance.approve(eatherTransporterInstance.address, eatherTokenId, accountsMap.validAccount1Option)
        await eatherTransporterInstance.transferEather(accountsMap.user2, eatherTokenId, accountsMap.validAccount1Option)

        const owner = await itemNFTInstance.ownerOf(eatherTokenId)
        owner.should.be.equal(accountsMap.user2)
      })
    })
    describe('B. Fail', async () => {
      before(async () => {
        eatherTransporterInstance = await contracts.initEatherTransporterInstance(accounts)
      })
      it('Can not transfer eather token when not allowed', async () => {
        await eatherTransporterInstance.updateOpenEather(false)
        const itemNFTInstance = await loadItemInstance()
        await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        const user = accountsMap.user1
        const eatherMintingResponse = await itemNFTInstance.mintItem(user, FORMULA_GENE, FORMULA_CLASS, ITEM_PRICE, 0)
        await itemNFTInstance.updateMintAdmin(eatherTransporterInstance.address, true)
        const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
        await itemNFTInstance.approve(eatherTransporterInstance.address, eatherTokenId, accountsMap.validAccount1Option)
        await catchRevertWithReason(eatherTransporterInstance.transferEather(accountsMap.user2, eatherTokenId, accountsMap.validAccount1Option), "you can't do this now")
      })
      it('Can not transfer eather token when not owned', async () => {
        await eatherTransporterInstance.updateOpenEather(true)
        const itemNFTInstance = await loadItemInstance()
        await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        const user = accountsMap.user1
        const eatherMintingResponse = await itemNFTInstance.mintItem(user, FORMULA_GENE, FORMULA_CLASS, ITEM_PRICE, 0)
        await itemNFTInstance.updateMintAdmin(eatherTransporterInstance.address, true)
        const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
        await itemNFTInstance.approve(eatherTransporterInstance.address, eatherTokenId, accountsMap.validAccount1Option)
        await catchRevertWithReason(eatherTransporterInstance.transferEather(accountsMap.user2, eatherTokenId, accountsMap.validAccount2Option), "not owner")
      })
      it('Can not transfer other item token', async () => {
        await eatherTransporterInstance.updateOpenEather(true)
        const itemNFTInstance = await loadItemInstance()
        await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        const user = accountsMap.user1
        const eatherMintingResponse = await itemNFTInstance.mintItem(user, NORMAL_GENE, NORMAL_CLASS, ITEM_PRICE, 0)
        await itemNFTInstance.updateMintAdmin(eatherTransporterInstance.address, true)
        const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
        await itemNFTInstance.approve(eatherTransporterInstance.address, eatherTokenId, accountsMap.validAccount1Option)
        await catchRevertWithReason(eatherTransporterInstance.transferEather(accountsMap.user2, eatherTokenId, accountsMap.validAccount1Option), "invalid gene")
      })
      it('Can not transfer eather token when not approved', async () => {
        await eatherTransporterInstance.updateOpenEather(true)
        const itemNFTInstance = await loadItemInstance()
        await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
        const user = accountsMap.user1
        const eatherMintingResponse = await itemNFTInstance.mintItem(user, FORMULA_GENE, FORMULA_CLASS, ITEM_PRICE, 0)
        await itemNFTInstance.updateMintAdmin(eatherTransporterInstance.address, true)
        const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
        await catchRevert(eatherTransporterInstance.transferEather(accountsMap.user2, eatherTokenId, accountsMap.validAccount1Option), "you can't do this now")
      })
    })
  })
})

async function loadItemInstance() {
  const itemAddress = await eatherTransporterInstance.itemNFT()
  return ITemNFT.at(itemAddress)
}
