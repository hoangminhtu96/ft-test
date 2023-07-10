const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const ITemNFT = artifacts.require('./ITemNFT.sol')
const { BN, listenEvent, accountsMap, value420MBN, value500BN, value1000BN, value5000BN, value100BN } = require('../utils')
const contracts = require('../utils/contracts')
const utils = require('../utils')
const {
  catchRevertWithReason
} = require('../utils/exceptions.js')
const messageSigner = require('../utils/messageSigner')
const { mapData, ITEM_PRICE } = require('../utils/dataHolder')
require('colors')

let itemUpgradingInstance
let itemNFTInstance
let mbusdTokenInstance
let musdtTokenInstance
let fotaTokenInstance
const SEED = 'FOTAToTheMoooooooon'
const eatherGene = 0
const eatherClass = 1
const normalGene = 1
const PAYMENT_TYPE_FOTA = 0
const PAYMENT_TYPE_USD = 1
const PAYMENT_TYPE_ALL = 2
const CURRENCY_FOTA = 0
const CURRENCY_BUSD = 1
const CURRENCY_USDT = 2

contract('ItemUpgrading', (accounts) => {
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
  describe('A. Success', async () => {
    let numberOfTry = 1
    beforeEach(async () => {
      itemUpgradingInstance = await contracts.initItemUpgradingContract(accounts)
      itemNFTInstance = await loadItemNFTInstance()
      mbusdTokenInstance = await loadBusdInstance()
      musdtTokenInstance = await loadUsdtInstance()
      fotaTokenInstance = await loadFotaInstance()
      await fotaTokenInstance.releaseIDOAllocation(accountsMap.mainAdmin)
      await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      await itemNFTInstance.updateUpgradingContract(itemUpgradingInstance.address)
    })
    it('can upgrade with all payment types and currencies', async () => {
      const acceptedRatio = 50
      const itemClass = 201
      const materialClasses = mapData.rare[itemClass]
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_USD, CURRENCY_BUSD)
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_USD, CURRENCY_USDT)
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_FOTA, CURRENCY_FOTA)
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_ALL, CURRENCY_BUSD)
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_ALL, CURRENCY_USDT)
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_ALL, CURRENCY_FOTA)
    })
    it('can upgrade to rare', async () => {
      const acceptedRatio = 50
      const itemClasses = Object.keys(mapData.rare)
      let itemClass
      for(let i = 0; i < itemClasses.length; i += 1) {
        itemClass = itemClasses[i]
        const materialClasses = mapData.rare[itemClass]
        await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, numberOfTry, PAYMENT_TYPE_USD, CURRENCY_BUSD)
      }
    })
    it('can upgrade to rare with valid ratio', async () => {
      const acceptedRatio = 50
      const itemClass = 201
      const materialClasses = mapData.rare[itemClass]
      await upgradeItem(itemClass, materialClasses, value500BN, acceptedRatio, 20)
    })
    it('can upgrade to epic 10%', async () => {
      const acceptedRatio = 10
      const itemClasses = Object.keys(mapData.epicNoUpgradable)
      let itemClass
      for(let i = 0; i < itemClasses.length; i += 1) {
        itemClass = itemClasses[i]
        const materialClasses = mapData.epicNoUpgradable[itemClass]
        await upgradeItem(itemClass, materialClasses, value1000BN, acceptedRatio, numberOfTry)
      }
    })
    it('can upgrade to epic 10% with valid ratio', async () => {
      const acceptedRatio = 10
      const itemClass = 302
      const materialClasses = mapData.epicNoUpgradable[itemClass]
      await upgradeItem(itemClass, materialClasses, value1000BN, acceptedRatio, 50)
    })
    it('can upgrade to epic 30%', async () => {
      const acceptedRatio = 30
      const itemClasses = Object.keys(mapData.epicUpgradable)
      let itemClass
      for(let i = 0; i < itemClasses.length; i += 1) {
        itemClass = itemClasses[i]
        const materialClasses = mapData.epicUpgradable[itemClass]
        await upgradeItem(itemClass, materialClasses, value1000BN, acceptedRatio, numberOfTry)
      }
    })
    it('can upgrade to epic 30% with valid ratio', async () => {
      const acceptedRatio = 30
      const itemClass = 301
      const materialClasses = mapData.epicUpgradable[itemClass]
      await upgradeItem(itemClass, materialClasses, value1000BN, acceptedRatio, 50)
    })
    it('can upgrade to legendary', async () => {
      const acceptedRatio = 10
      const itemClasses = Object.keys(mapData.legendary)
      let itemClass
      for(let i = 0; i < itemClasses.length; i += 1) {
        itemClass = itemClasses[i]
        const materialClasses = mapData.legendary[itemClass]
        await upgradeItem(itemClass, materialClasses, value5000BN, acceptedRatio, numberOfTry)
      }
    })
    it('can upgrade to legendary with valid ratio', async () => {
      const acceptedRatio = 10
      const itemClass = 401
      const materialClasses = mapData.legendary[itemClass]
      await upgradeItem(itemClass, materialClasses, value5000BN, acceptedRatio, 50)
    })
  })
  describe('B. Fail', async () => {
    const itemClass = 201
    const eatherId = 1
    const materialIds = mapData.rare[itemClass]
    let signature
    const acceptedRatio = 50
    before(async () => {
      itemUpgradingInstance = await contracts.initItemUpgradingContract(accounts)
      itemNFTInstance = await loadItemNFTInstance()
      await itemNFTInstance.updateMintAdmin(accountsMap.mainAdmin, true)
      signature = messageSigner.signMessageUpgradeItem(itemUpgradingInstance.address, {
        user: accountsMap.mainAdmin,
        seed: SEED,
        nonce: 0
      })
      await itemUpgradingInstance.updatePaymentType(PAYMENT_TYPE_USD)
    })
    it('Wrong seed', async () => {
      const signatureFail = messageSigner.signMessageUpgradeItem('0x0000000000000000000000000000000000000000', {
        user: '0x0000000000000000000000000000000000000000',
        seed: SEED,
        nonce: 4
      })
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, materialIds, eatherId, CURRENCY_BUSD, acceptedRatio, SEED, signatureFail), "MessageVerifier: invalid signature");
    })
    it('Wrong ratio', async () => {
      const acceptedRatioError = 90
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, materialIds, eatherId, CURRENCY_BUSD, acceptedRatioError, SEED, signature), "Upgrading: invalid ratio");
    })
    it('Wrong input', async () => {
      const materialIdsError = []
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, materialIdsError, eatherId, CURRENCY_BUSD, acceptedRatio, SEED, signature), "Upgrading: invalid input");
    })
    it('Wrong materials: non exists item', async () => {
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, materialIds, eatherId, CURRENCY_BUSD, acceptedRatio, SEED, signature), "ERC721: owner query for nonexistent token");
    })
    it('Wrong materials: not own item', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.user1, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherId, CURRENCY_BUSD, acceptedRatio, SEED, signature), "Upgrading: not owner");
    })
    it('Wrong materials: invalid class', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0] + 1, ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherId, CURRENCY_BUSD, acceptedRatio, SEED, signature), "Upgrading: invalid class");
    })
    it('Wrong materials: not approve', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherId, CURRENCY_BUSD, acceptedRatio, SEED, signature), "Upgrading: please approve token first");
    })
    it('Not owner of eather token', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.user1, eatherGene, eatherId, ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_BUSD, 1, SEED, signature), "Upgrading: not owner of eather token");
    })
    it('Invalid eather item', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_BUSD, 1, SEED, signature), "Upgrading: invalid eather item");
    })
    it('Not approve eather token', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, eatherGene, eatherId, ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_BUSD, 1, SEED, signature), "Upgrading: please approve eather token first");
    })
    it('No approve busd', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, eatherGene, eatherId, ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      itemNFTInstance.approve(itemUpgradingInstance.address, eatherTokenId)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_BUSD, 1, SEED, signature), "Upgrading: please approve usd token first");
    })
    it('Have no busd', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, eatherGene, eatherId, ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      itemNFTInstance.approve(itemUpgradingInstance.address, eatherTokenId)
      const busdToken = await loadBusdInstance()
      await busdToken.burn(await busdToken.balanceOf(accountsMap.mainAdmin))
      await busdToken.approve(itemUpgradingInstance.address, value420MBN)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_BUSD, 1, SEED, signature), "Upgrading: insufficient balance");
    })
    it('No approve usdt', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, eatherGene, eatherId, ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      itemNFTInstance.approve(itemUpgradingInstance.address, eatherTokenId)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_USDT, 1, SEED, signature), "Upgrading: please approve usd token first");
    })
    it('Have no usdt', async () => {
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialIds[0], ITEM_PRICE, 0)
      const { tokenId } = mintingResponse.receipt.logs[0].args
      itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)
      const eatherMintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, eatherGene, eatherId, ITEM_PRICE, 0)
      const eatherTokenId = eatherMintingResponse.receipt.logs[0].args.tokenId
      await itemNFTInstance.updateMintAdmin(itemUpgradingInstance.address, true)
      itemNFTInstance.approve(itemUpgradingInstance.address, eatherTokenId)
      const usdtToken = await loadUsdtInstance()
      await usdtToken.burn(await usdtToken.balanceOf(accountsMap.mainAdmin))
      await usdtToken.approve(itemUpgradingInstance.address, value420MBN)
      await catchRevertWithReason(itemUpgradingInstance.upgradeItem(itemClass, [tokenId], eatherTokenId, CURRENCY_USDT, 1, SEED, signature), "Upgrading: insufficient balance");
    })
  })
})

async function loadBusdInstance() {
  const busdAddress = await itemUpgradingInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await itemUpgradingInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
}

async function loadFotaInstance() {
  const fotaAddress = await itemUpgradingInstance.fotaToken()
  return FOTAToken.at(fotaAddress);
}

async function loadItemNFTInstance() {
  const nftAddress = await itemUpgradingInstance.itemNft()
  return ITemNFT.at(nftAddress)
}

async function genSignature() {
  let nonce = await itemUpgradingInstance.nonces(accountsMap.mainAdmin)
  return messageSigner.signMessageUpgradeItem(itemUpgradingInstance.address, {
    user: accountsMap.mainAdmin,
    seed: SEED,
    nonce: nonce.toNumber()
  })
}

async function upgradeItem(itemClass, materialClasses, fee, acceptedRatio, numberOfTry, paymentType = PAYMENT_TYPE_USD, paymentCurrency = CURRENCY_BUSD) {
  await itemUpgradingInstance.updatePaymentType(paymentType)
  let tokenInstance = fotaTokenInstance
  if (paymentType !== PAYMENT_TYPE_FOTA) {
    if (paymentCurrency === CURRENCY_BUSD) {
      tokenInstance = mbusdTokenInstance
    } else if (paymentCurrency === CURRENCY_USDT) {
      tokenInstance = musdtTokenInstance
    }
  }
  await tokenInstance.approve(itemUpgradingInstance.address, await tokenInstance.maxSupply())
  let successCount = 0
  for(let i = 0; i < numberOfTry; i++) {
    let totalFee = fee
    let totalOwnPrice
    const materialIds = []
    let materialsPrice = new BN('0')
    for(let j = 0; j < materialClasses.length; j++) {
      const price = ITEM_PRICE.mul(new BN(`${j + 1}`))
      if (totalOwnPrice === undefined) {
        totalOwnPrice = price
      } else {
        totalOwnPrice = totalOwnPrice.add(price)
      }
      const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, normalGene, materialClasses[j], price, 0)
      listenEvent(mintingResponse, 'Transfer')
      const { tokenId } = mintingResponse.receipt.logs[0].args
      materialIds.push(tokenId)
      await itemNFTInstance.approve(itemUpgradingInstance.address, tokenId)

      materialsPrice = materialsPrice.add(price)
    }

    // mint eather
    const mintingResponse = await itemNFTInstance.mintItem(accountsMap.mainAdmin, eatherGene, eatherClass, ITEM_PRICE, 0)
    totalFee = totalFee.add(ITEM_PRICE)
    const eatherId = mintingResponse.receipt.logs[0].args.tokenId
    await itemNFTInstance.approve(itemUpgradingInstance.address, eatherId)
    listenEvent(mintingResponse, 'Transfer')

    console.log(`Upgrading ${itemClass} from [${materialClasses}]: No.${i + 1} of ${numberOfTry}`)
    const signature = await genSignature()
    // validate fee
    const balanceBefore = await tokenInstance.balanceOf(accountsMap.mainAdmin)
    const upgradeResponse = await itemUpgradingInstance.upgradeItem(itemClass, materialIds, eatherId, paymentCurrency, acceptedRatio, SEED, signature)
    const balanceAfter = await tokenInstance.balanceOf(accountsMap.mainAdmin)
    balanceAfter.should.be.a.bignumber.that.equals(balanceBefore.sub(fee))

    listenEvent(upgradeResponse, 'Upgraded')
    const success = upgradeResponse.logs[0].args.success
    console.log({success})
    if (success) {
      successCount++
      // validate new item
      const newTokenId = upgradeResponse.logs[0].args._newTokenId
      const owner = await itemNFTInstance.ownerOf(newTokenId)
      owner.should.be.equal(accountsMap.mainAdmin)

      // validate new item's ownPrice
      const ownPriceFeeWhenSuccess = materialsPrice.add(ITEM_PRICE).add(fee)
      const newItem = await itemNFTInstance.getItem(newTokenId)
      const ownPriceIndex = '3'
      newItem[ownPriceIndex].should.be.a.bignumber.that.equals(ownPriceFeeWhenSuccess)

      // materialIds should be burnt
      for(let j = 0; j < materialIds.length; j++) {
        await catchRevertWithReason(itemNFTInstance.ownerOf(materialIds[j]), 'ERC721: owner query for nonexistent token')
      }
    } else {
      // validate failedUpgradingAmount
      for(let j = 0; j < materialIds.length; j++) {
        const item = await itemNFTInstance.getItem(materialIds[j])
        const ownPriceIndex = '3'
        const failedUpgradingAmountIndex = '4'
        item[failedUpgradingAmountIndex].should.be.a.bignumber.that.equals(totalFee.mul(item[ownPriceIndex]).div(totalOwnPrice))
      }
    }

    // eather token should be burnt
    await catchRevertWithReason(itemNFTInstance.ownerOf(eatherId), 'ERC721: owner query for nonexistent token')
  }
  if (numberOfTry > 1) {
    successCount.should.be.greaterThanOrEqual(Math.floor(numberOfTry * (acceptedRatio / 2) / 100))
  }
}
