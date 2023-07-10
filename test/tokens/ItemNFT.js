const util = require('../utils')
const contracts = require('../utils/contracts')
const {
  catchRevert
} = require('../utils/exceptions.js')
let itemNFTInstance
const initGene = 1
const initClass = 101
const ITEM_PRICE = util.value1BN
let index = 0

contract('ItemNFT', async (accounts) => {
  before(async () => {
    itemNFTInstance = await contracts.initItemNFTInstance(accounts)
  })
  describe('I. Success', () => {
	  it('1. update mint admin', async () => {
	    await itemNFTInstance.updateMintAdmin(util.accountsMap.mainAdmin, true)
      const _isMainAdmin = await itemNFTInstance._isMainAdmin(util.accountsMap.mainAdminOption)
      _isMainAdmin.should.be.true
    })
	  it('2. mint-able', async () => {
      const oldBalance = await itemNFTInstance.balanceOf(util.accountsMap.mainAdmin)
      const response = await itemNFTInstance.mintItem(util.accountsMap.mainAdmin, initGene, initClass,  ITEM_PRICE, ++index)
      const newBalance = await itemNFTInstance.balanceOf(util.accountsMap.mainAdmin)
      newBalance.toNumber().should.be.equal(oldBalance.toNumber() + 1)
      util.listenEvent(response, 'Transfer')
      const { tokenId } = response.receipt.logs[0].args
      const owner = await itemNFTInstance.ownerOf(tokenId)
      owner.should.be.equal(util.accountsMap.mainAdmin)

     })
    it('3. burnable', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(util.accountsMap.mainAdmin, initGene, initClass,  ITEM_PRICE, ++index)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      const oldBalance = await itemNFTInstance.balanceOf(util.accountsMap.mainAdmin)
      const response = await itemNFTInstance.burn(tokenId)
      const newBalance = await itemNFTInstance.balanceOf(util.accountsMap.mainAdmin)
      newBalance.toNumber().should.be.equal(oldBalance.toNumber() - 1)
      util.listenEvent(response, 'Transfer', 1)
      await catchRevert(itemNFTInstance.ownerOf(tokenId))
    })
    it('4. correct token info', async () => {
      const response = await itemNFTInstance.mintItem(util.accountsMap.mainAdmin, initGene, initClass,  ITEM_PRICE, ++index)
      const { tokenId } = response.receipt.logs[0].args
      const item = await itemNFTInstance.getItem(tokenId)
      item['0'].toNumber().should.be.equal(initGene)
      item['1'].toNumber().should.be.equal(initClass)
    })
    it('5. set creator', async () => {
      await itemNFTInstance.setCreator(initClass, util.accountsMap.user1)
      const creator = await itemNFTInstance.creators(initClass)
      creator.should.be.equal(util.accountsMap.user1)
    })
    it('6. change creator', async () => {
      await itemNFTInstance.setCreator(initClass, util.accountsMap.user2)
      const creator = await itemNFTInstance.creators(initClass)
      creator.should.be.equal(util.accountsMap.user2)
    })
  })
})
