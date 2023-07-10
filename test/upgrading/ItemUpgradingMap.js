const { listenEvent, accountsMap, value1BN, value2BN } = require('../utils')
const contracts = require('../utils/contracts')
const {
  catchRevertWithReason
} = require('../utils/exceptions.js')
const { mapData } = require('../utils/dataHolder')
let itemUpgradingMapInstance
const gene = 2
const existsItemClass = 201
const itemClass = 418
const materials = [300, 201]
const fee = value1BN
const ratio = 10
const MATERIALS_INDEX = 0
const FEE_INDEX = 1
const RATIO_INDEX = 2
const newFee = value2BN
const newRatio = 30

contract('ItemUpgradingMap', (accounts) => {
  describe('Initialize map', async () => {
    it('Should have correct data', async () => {
      itemUpgradingMapInstance = await contracts.initItemUpgradingMapContract(accounts)
      const geneKeys = Object.keys(mapData)
      for(let i = 0; i < geneKeys.length; i++) {
        const itemClassKeys = Object.keys(mapData[geneKeys[i]])
        for(let j = 0; j < itemClassKeys.length; j++) {
          const materials = mapData[geneKeys[i]][itemClassKeys[j]]
          // console.log('geneKeys[i]', geneKeys[i])
          // console.log('itemClassKeys[j]', itemClassKeys[j])
          // console.log('materials', materials)
          const item = await itemUpgradingMapInstance.getItem(itemClassKeys[j])
          item[MATERIALS_INDEX].length.should.be.a.equals(materials.length)
          for(let k = 0; k < materials.length; k++) {
            item[MATERIALS_INDEX][k].toNumber().should.be.equals(materials[k])
          }
        }
      }
    })
  })
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        itemUpgradingMapInstance = await contracts.initItemUpgradingMapContract(accounts)
      })
      it('set item', async () => {
        const response = await itemUpgradingMapInstance.setItem(gene, itemClass, materials, fee, ratio)
        listenEvent(response, 'ItemSet')
        const item = await itemUpgradingMapInstance.getItem(itemClass)
        item[MATERIALS_INDEX].length.should.be.a.equals(2)
        item[FEE_INDEX].should.be.a.bignumber.that.equals(value1BN)
        item[RATIO_INDEX].toNumber().should.be.equal(ratio)
      })
      it('update item', async () => {
        await itemUpgradingMapInstance.updateItem(existsItemClass, materials, newFee, newRatio)
        const item = await itemUpgradingMapInstance.getItem(existsItemClass)
        item[FEE_INDEX].should.be.a.bignumber.that.equals(newFee)
        item[RATIO_INDEX].toNumber().should.be.equal(newRatio)
	    })
      it('update fee', async () => {
        const response = await itemUpgradingMapInstance.updateFee(gene, newFee)
        listenEvent(response, 'FeeUpdated')
        const item = await itemUpgradingMapInstance.getItem(existsItemClass)
        item[FEE_INDEX].should.be.a.bignumber.that.equals(newFee)
      })
      it('update ratio', async () => {
        const response = await itemUpgradingMapInstance.updateRatio(gene, newRatio)
        listenEvent(response, 'RatioUpdated')
        const item = await itemUpgradingMapInstance.getItem(existsItemClass)
        item[RATIO_INDEX].toNumber().should.be.equal(newRatio)
      })
    })
    describe('B. Fail', async() => {
      before(async () => {
        itemUpgradingMapInstance = await contracts.initItemUpgradingMapContract(accounts)
      })
      it('set item: unauthorized', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.setItem(gene, itemClass, materials, fee, ratio, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('set item: invalid data', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.setItem(gene, existsItemClass, materials, fee, ratio), 'Item Upgrading: item exists')
        await catchRevertWithReason(itemUpgradingMapInstance.setItem(gene, 199, materials, fee, ratio), 'Item Upgrading: invalid class')
        await catchRevertWithReason(itemUpgradingMapInstance.setItem(gene, itemClass, materials, fee, 100), 'Item Upgrading: invalid ratio')
      })
      it('update item: unauthorized', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.updateItem(itemClass, materials, fee, ratio, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('update item: invalid data', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.updateItem(itemClass + 10000, materials, fee, ratio), 'item not exists')
          await catchRevertWithReason(itemUpgradingMapInstance.updateItem(199, materials, fee, ratio), 'Item Upgrading: invalid class')
          await catchRevertWithReason(itemUpgradingMapInstance.updateItem(existsItemClass, materials, fee, 100), 'Item Upgrading: invalid ratio')
      })
      it('update fee: unauthorized', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.updateFee(gene, fee, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('update fee: invalid data', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.updateFee(1, fee), 'invalid gene')
        await catchRevertWithReason(itemUpgradingMapInstance.updateFee(127, fee), 'invalid gene')
      })
      it('update ratio: unauthorized', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.updateRatio(gene, ratio, accountsMap.accountUnauthorizedOption), 'onlyMainAdmin')
      })
      it('update ratio: invalid data', async () => {
        await catchRevertWithReason(itemUpgradingMapInstance.updateRatio(1, ratio), 'invalid gene')
        await catchRevertWithReason(itemUpgradingMapInstance.updateRatio(127, ratio), 'invalid gene')
        await catchRevertWithReason(itemUpgradingMapInstance.updateRatio(gene, 100), 'Item Upgrading: invalid ratio')
      })
    })
  })
})
