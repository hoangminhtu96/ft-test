const util = require('./index')
const { EIP712_NAME, EIP712_VERSION } = require('./messageSigner')
const {deployProxy} = require('@openzeppelin/truffle-upgrades')
const {accountsMap, value1BN, value1000BN } = require('./index')
const moment = require('moment')
const { HERO_PRICE } = require('./dataHolder')

const Citizen = artifacts.require('./Citizen.sol')
// const EatherBonus = artifacts.require('./EatherBonus.sol.a')
// const EatherSale = artifacts.require('./EatherSale.sol')
const EnergyManager = artifacts.require('./EnergyManager.sol')
const FOTAFarm = artifacts.require('./FOTAFarm.sol')
const FOTAGamePVE = artifacts.require('./FOTAGamePVE.sol')
// const FOTAGamePVP = artifacts.require('./FOTAGamePVP.sol')
const FOTAPricer = artifacts.require('./FOTAPricer.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')
const EatherTransporter = artifacts.require('./EatherTransporter.sol')
const GameProxy = artifacts.require('./GameProxy.sol')
const HeroNFT = artifacts.require('./HeroNFT.sol')
const ITemNFT = artifacts.require('./ITemNFT.sol')
const LandNFT = artifacts.require('./LandNFT.sol')
// const ItemUpgrading = artifacts.require('./ItemUpgrading.sol')
// const ItemUpgradingMap = artifacts.require('./ItemUpgradingMap.sol')
const LandLordManager = artifacts.require('./LandLordManager.sol')
// const SkillUpgrading = artifacts.require('./SkillUpgrading.sol.a')
const MarketPlace = artifacts.require('./MarketPlace.sol')
const MarketPlaceV2 = artifacts.require('./MarketPlaceV2.sol')
const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
// const PrivateSale = artifacts.require('./PrivateSale.sol')
// const DGGPrivateSale = artifacts.require('./DGGPrivateSale.sol')
const Treasury = artifacts.require('./Treasury.sol')
// const Whitelist = artifacts.require('./Whitelist.sol')
const Reward = artifacts.require('./Reward.sol')
const RewardManager = artifacts.require('./RewardManager.sol')
const MLPToken = artifacts.require('./MLPToken.sol')
// const LaunchPad = artifacts.require('./LaunchPad.sol')
// const LaunchPadManager = artifacts.require('./LaunchPadManager.sol')
// const GallerLaunchPadHero = artifacts.require('./GallerLaunchPadHero.sol')
// const GallerLaunchPadHeroRandom = artifacts.require('./GallerLaunchPadHeroRandom.sol')
// const SpinRandomHeroNft = artifacts.require('./SpinRandomHeroNft.sol')

async function initCitizenInstance(accounts) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  return deployProxy(Citizen, [mainAdmin])
}

async function initFotaTokenInstance(accounts) {
  const {
    liquidityPoolAddress,
  } = util.getAccounts(accounts)
  return FOTAToken.new(liquidityPoolAddress)
}

async function initMockTokenInstance() {
  const mbusdTokenInstance = await MBUSDToken.new()
  const musdtTokenInstance = await MUSDTToken.new()
  const mLPTokenInstance = await MLPToken.new()
  return {
    mbusdTokenInstance,
    musdtTokenInstance,
    mLPTokenInstance
  }
}

async function initHeroNFTInstance(accounts, initStrength = false) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  const fotaPricerInstance = await initFotaPricerInstance(accounts)
  const heroNFTInstance = await deployProxy(HeroNFT, [mainAdmin, 'FOTA HERO', 'HERO'])
  if (initStrength) {
    await setupHero(heroNFTInstance)
  }
  await initHeroData(heroNFTInstance, mainAdmin)
  await heroNFTInstance.setFOTAPricer(fotaPricerInstance.address)
  return heroNFTInstance
}

async function initHeroData(heroNFTInstance, mainAdmin) {
  await heroNFTInstance.addHeroClass('Foo', 'Bar', 'Lorem', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
  await heroNFTInstance.updateProfitRate(300)
}

async function setupHero(heroNFT) {
  await heroNFT.updateBaseStrengths(2, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(3, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(4, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(5, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(6, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(7, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(8, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(9, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateBaseStrengths(10, [100, 100, 100, 100, 100, 100, 100])

  await heroNFT.updateStrengthBonus(2, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(3, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(4, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(5, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(6, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(7, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(8, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(9, [100, 100, 100, 100, 100, 100, 100])
  await heroNFT.updateStrengthBonus(10, [100, 100, 100, 100, 100, 100, 100])

  await heroNFT.updateExperienceCheckpoint(2, 200) // TODO
  await heroNFT.updateExperienceCheckpoint(3, 300)
  await heroNFT.updateExperienceCheckpoint(4, 400)
  await heroNFT.updateExperienceCheckpoint(5, 500)
  await heroNFT.updateExperienceCheckpoint(6, 600)
  await heroNFT.updateExperienceCheckpoint(7, 700)
  await heroNFT.updateExperienceCheckpoint(8, 800)
  await heroNFT.updateExperienceCheckpoint(9, 900)
  await heroNFT.updateExperienceCheckpoint(10, 1000)
  await heroNFT.updateExperienceCheckpoint(11, 1100)
  await heroNFT.updateExperienceCheckpoint(12, 1200)
  await heroNFT.updateExperienceCheckpoint(13, 1300)
  await heroNFT.updateExperienceCheckpoint(14, 1400)
  await heroNFT.updateExperienceCheckpoint(15, 1500)
  await heroNFT.updateExperienceCheckpoint(16, 1600)
  await heroNFT.updateExperienceCheckpoint(17, 1700)
  await heroNFT.updateExperienceCheckpoint(18, 1800)
  await heroNFT.updateExperienceCheckpoint(19, 1900)
  await heroNFT.updateExperienceCheckpoint(20, 2000)
  await heroNFT.updateExperienceCheckpoint(21, 2100)
  await heroNFT.updateExperienceCheckpoint(22, 2200)
  await heroNFT.updateExperienceCheckpoint(23, 2300)
  await heroNFT.updateExperienceCheckpoint(24, 2400)
  await heroNFT.updateExperienceCheckpoint(25, 2500)
}

async function initItemNFTInstance(accounts) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)

  const itemNFTInstance = await deployProxy(ITemNFT, [mainAdmin, 'FOTA ITEM', 'ITEM'])
  await initItemData(itemNFTInstance, mainAdmin)
  return itemNFTInstance
}

async function initItemData(itemNFTInstance, mainAdmin) {
  itemNFTInstance.addItemClass(0, 1, mainAdmin, [0, 0, 0, 0, 0, 0, 0])
}

async function initEnergyManagerInstance(accounts, pure = true) {
  const {
    mainAdmin
  } = util.getAccounts(accounts)
  const energyManagerInstance = await deployProxy(EnergyManager, [mainAdmin])
  if (pure) {
    return energyManagerInstance
  }
  const citizenInstance = await initCitizenInstance(accounts)
  const heroNFTInstance = await initHeroNFTInstance(accounts, false)
  await heroNFTInstance.updateProfitRate(300, 200)
  const itemNFTInstance = await initItemNFTInstance(accounts)
  const treasuryInstance = await deployProxy(Treasury, [mainAdmin, heroNFTInstance.address, itemNFTInstance.address])
  const fotaPricerInstance = await initFotaPricerInstance(accounts)
  const eatherTransporter = await deployProxy(EatherTransporter, [mainAdmin, itemNFTInstance.address])
  const marketPlaceInstance = await deployProxy(MarketPlace, [
    mainAdmin,
    citizenInstance.address,
    heroNFTInstance.address,
    itemNFTInstance.address,
    treasuryInstance.address,
    fotaPricerInstance.address,
    eatherTransporter.address
  ])
  await energyManagerInstance.setContracts(heroNFTInstance.address, marketPlaceInstance.address)
  await energyManagerInstance.updatePointContract(heroNFTInstance.address, true)
  return energyManagerInstance
}

// async function initMarketPlaceInstance(accounts) {
//   const {
//     mainAdmin
//   } = util.getAccounts(accounts)
//   const energyManagerInstance = await initEnergyManagerInstance(accounts)
//   const citizenInstance = await initCitizenInstance(accounts)
//   const fotaTokenInstance = await initFotaTokenInstance(accounts)
//   await fotaTokenInstance.setGameAddress(mainAdmin, true)
//   const { mbusdTokenInstance, musdtTokenInstance } = await initMockTokenInstance()
//   const heroNFTInstance = await initHeroNFTInstance(accounts, false)
//   const itemNFTInstance = await initItemNFTInstance(accounts)
//   const treasuryInstance = await deployProxy(Treasury, [mainAdmin, heroNFTInstance.address, itemNFTInstance.address])
//   const fotaPricerInstance = await initFotaPricerInstance(accounts)
//   const eatherTransporter = await deployProxy(EatherTransporter, [mainAdmin, itemNFTInstance.address])
//   const pve = await initPVEInstance(accounts, {
//     citizenInstance,
//     energyManagerInstance,
//     heroNFTInstance,
//     itemNFTInstance,
//     fotaPricerInstance
//   })
//   const marketPlaceInstance = await deployProxy(MarketPlace, [
//     mainAdmin,
//     citizenInstance.address,
//     heroNFTInstance.address,
//     itemNFTInstance.address,
//     treasuryInstance.address,
//     fotaPricerInstance.address,
//     eatherTransporter.address
//   ])
//   await heroNFTInstance.updateGameContract(marketPlaceInstance.address, true)
//   await marketPlaceInstance.setToken(fotaTokenInstance.address, mbusdTokenInstance.address, musdtTokenInstance.address)
//   await marketPlaceInstance.setGameContract(pve.address)
//   await marketPlaceInstance.setShares(2000, 3000, 5000)
//   await marketPlaceInstance.setMinLevel(10)
//   await marketPlaceInstance.setMinGene(2)
//   await treasuryInstance.setToken(fotaTokenInstance.address, mbusdTokenInstance.address, musdtTokenInstance.address)
//   await treasuryInstance.setMarketPlace(marketPlaceInstance.address)
//   await energyManagerInstance.updatePointContract(marketPlaceInstance.address, true)
//   await energyManagerInstance.updatePointContract(heroNFTInstance.address, true)
//   return marketPlaceInstance
// }

// async function initPrivateSaleInstance(accounts) {
//   const {
//     mainAdmin
//   } = util.getAccounts(accounts)
//   const fotaTokenInstance = await initFotaTokenInstance(accounts)
//   await fotaTokenInstance.setGameAddress(mainAdmin, true)
//   const { mbusdTokenInstance, musdtTokenInstance } = await initMockTokenInstance()
//   const privateSaleInstance = await deployProxy(PrivateSale, [mainAdmin, mainAdmin, fotaTokenInstance.address])
//   await privateSaleInstance.setUsdToken(mbusdTokenInstance.address, musdtTokenInstance.address)
//   return privateSaleInstance
// }
//
// async function initDGGPrivateSaleInstance(accounts) {
//   const {
//     mainAdmin
//   } = util.getAccounts(accounts)
//   const fotaTokenInstance = await initFotaTokenInstance(accounts)
//   await fotaTokenInstance.setGameAddress(mainAdmin, true)
//   const { mbusdTokenInstance, musdtTokenInstance } = await initMockTokenInstance()
//   const privateSaleInstance = await deployProxy(DGGPrivateSale, ['FOTA', '1',  mainAdmin, mainAdmin, fotaTokenInstance.address])
//   await privateSaleInstance.setUsdToken(mbusdTokenInstance.address, musdtTokenInstance.address)
//   return privateSaleInstance
// }

// async function initItemUpgradingMapContract(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   return deployProxy(ItemUpgradingMap, [mainAdmin])
// }
//
// async function initItemUpgradingContract(accounts) {
//   const {
//     mainAdmin,
//     user10,
//     zeroAddress
//   } = util.getAccounts(accounts)
//   const itemNFTInstance = await initItemNFTInstance(accounts)
//   const { mbusdTokenInstance, musdtTokenInstance, mLPTokenInstance } = await initMockTokenInstance()
//   const fotaTokenInstance = await initFotaTokenInstance(accounts)
//   const itemUpgradingMap = await initItemUpgradingMapContract(accounts)
//   const fotaPricerInstance = await initFotaPricerInstance(accounts)
//   const itemUpgrading = await deployProxy(ItemUpgrading, [EIP712_NAME, EIP712_VERSION, mainAdmin, user10, itemNFTInstance.address, itemUpgradingMap.address, fotaPricerInstance.address, [zeroAddress]])
//   await itemUpgrading.setToken(fotaTokenInstance.address, mbusdTokenInstance.address, musdtTokenInstance.address)
//   await itemUpgrading.updateLPToken(mLPTokenInstance.address, mLPTokenInstance.address, mLPTokenInstance.address)
//   return itemUpgrading
// }
//
// async function initSkillUpgradingContract(accounts) {
//   const {
//     mainAdmin,
//     user10,
//     zeroAddress
//   } = util.getAccounts(accounts)
//   const energyManagerInstance = await initEnergyManagerInstance(accounts)
//   const heroNFTInstance = await initHeroNFTInstance(accounts, false)
//   const itemNFTInstance = await initItemNFTInstance(accounts)
//   const skillUpgrading = await deployProxy(SkillUpgrading, [mainAdmin, heroNFTInstance.address, itemNFTInstance.address])
//   await energyManagerInstance.updatePointContract(heroNFTInstance.address, true)
//   await heroNFTInstance.updateMintAdmin(skillUpgrading.address, true)
//   return skillUpgrading
// }
//
// async function initEatherSaleInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const marketPlaceInstance = await initMarketPlaceInstance(accounts)
//   const fotaPricerInstance = await initFotaPricerInstance(accounts)
//   const itemNFTInstanceAddress = await marketPlaceInstance.nftTokens(1)
//   const busdAddress = await marketPlaceInstance.busdToken()
//   const usdtAddress = await marketPlaceInstance.usdtToken()
//   const fotaAddress = await marketPlaceInstance.fotaToken()
//   const mbusdTokenInstance = await MBUSDToken.at(busdAddress)
//   const musdtTokenInstance = await MUSDTToken.at(usdtAddress)
//   const fotaTokenInstance = await FOTAToken.at(fotaAddress)
//   const itemNFTInstance = await ITemNFT.at(itemNFTInstanceAddress)
//   const itemPrice = value1BN
//   const pools = [mainAdmin]
//   const eatherSaleInstance = await deployProxy(EatherSale, [mainAdmin, marketPlaceInstance.address, fotaPricerInstance.address, itemNFTInstance.address, itemPrice, pools])
//   eatherSaleInstance.setFOTAToken(fotaTokenInstance.address)
//   eatherSaleInstance.setUsdToken(mbusdTokenInstance.address, musdtTokenInstance.address)
//   return eatherSaleInstance
// }
//
// async function initTreasuryInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const marketPlace = await initMarketPlaceInstance(accounts)
//   const heroToken = await marketPlace.nftTokens(0)
//   const itemToken = await marketPlace.nftTokens(1)
//   let citizen = await marketPlace.citizen()
//   citizen = await Citizen.at(citizen)
//   const treasury = await deployProxy(Treasury, [mainAdmin, heroToken, itemToken])
//   await treasury.setFOTAToken(await marketPlace.fotaToken())
//   await treasury.setMarketPlace(marketPlace.address)
//   await citizen.setWhiteList(treasury.address, true)
//   return {
//     treasury,
//     marketPlace
//   }
// }

async function initFotaPricerInstance(accounts) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  return deployProxy(FOTAPricer, [mainAdmin, mainAdmin, mainAdmin, mainAdmin, 1000])
}

// async function initEatherTransporterInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const itemNFTInstance = await initItemNFTInstance(accounts)
//   return deployProxy(EatherTransporter, [mainAdmin, itemNFTInstance.address])
// }

async function initFOTAFarmInstance(accounts, fotaTokenInstance = undefined) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  const fotaFarmInstance = await deployProxy(FOTAFarm, [mainAdmin])
  if (!fotaTokenInstance) {
    fotaTokenInstance = await initFotaTokenInstance(accounts)
  }
  await fotaFarmInstance.setContracts(fotaTokenInstance.address, fotaTokenInstance.address)
  return fotaFarmInstance
}

// async function initWhitelistInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const whiteListInstance = await deployProxy(Whitelist, [mainAdmin])
//   const { mbusdTokenInstance, musdtTokenInstance } = await initMockTokenInstance()
//   await whiteListInstance.setUsdToken(mbusdTokenInstance.address, musdtTokenInstance.address)
//   return whiteListInstance
// }

async function initLandLordManager(accounts, fotaAddress, pveAddress, pricerAddress, landNFTInstanceAddress, treasuryInstanceAddress, gameProxyInstanceAddress, citizenInstanceAddress) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  if (fotaAddress) {
    return deployProxy(LandLordManager, [mainAdmin, fotaAddress, pricerAddress, landNFTInstanceAddress, treasuryInstanceAddress, gameProxyInstanceAddress, citizenInstanceAddress])
  } else {
    const pveInstance = await deployProxy(FOTAGamePVE, ['FOTA', '1', mainAdmin, mainAdmin, mainAdmin, mainAdmin, mainAdmin, mainAdmin])
    const fotaTokenInstance = await initFotaTokenInstance(accounts)
    await fotaTokenInstance.setGameAddress(mainAdmin, true)
    const fotaPricerInstance = await initFotaPricerInstance(accounts)
    const fotaFarmInstance = await initFOTAFarmInstance(accounts, fotaTokenInstance)
    const landNFTInstance = await deployProxy(LandNFT, [mainAdmin, 'FOTA LAND', 'LAND'])
    const gameProxyInstance = await deployProxy(GameProxy, [mainAdmin, pveInstance.address, pveInstance.address, pveInstance.address, fotaFarmInstance.address])
    const citizenInstance = await initCitizenInstance(accounts)
    const treasuryInstance = await deployProxy(Treasury, [mainAdmin, landNFTInstance.address, landNFTInstance.address])
    const landLordManagerInstance = await deployProxy(LandLordManager, [mainAdmin, fotaTokenInstance.address, fotaPricerInstance.address, landNFTInstance.address, treasuryInstance.address, gameProxyInstance.address, citizenInstance.address])
    await landNFTInstance.updateMintAdmin(landLordManagerInstance.address, true)
    return landLordManagerInstance
  }
}

async function initRewardInstance(accounts) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  const fotaTokenInstance = await initFotaTokenInstance(accounts)
  return deployProxy(Reward, [mainAdmin, fotaTokenInstance.address])
}

async function initRewardManagerInstance(accounts, setContracts = false) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  const citizenInstance = await initCitizenInstance(accounts)
  const fotaPricerInstance = await initFotaPricerInstance(accounts)
  const rewardManagerInstance = await deployProxy(RewardManager, [mainAdmin, citizenInstance.address, fotaPricerInstance.address])
  const startTimeValue = moment().subtract(20, 'd').startOf('d').unix()
  // await rewardManagerInstance.start(startTimeValue)
  if (setContracts) {
    const energyManagerInstance = await initEnergyManagerInstance(accounts)
    const heroNFTInstance = await initHeroNFTInstance(accounts)
    const fotaTokenInstance = await initFotaTokenInstance(accounts)
    const itemNFTInstance = await initItemNFTInstance(accounts)
    const marketPlaceInstance = await deployProxy(MarketPlace, [mainAdmin])
    const pveInstance = await deployProxy(FOTAGamePVE, ['FOTA', '1', mainAdmin, energyManagerInstance.address, rewardManagerInstance.address, heroNFTInstance.address, itemNFTInstance.address, marketPlaceInstance.address])
    const fotaFarmInstance = await initFOTAFarmInstance(accounts, fotaTokenInstance)
    const gameProxyInstance = await deployProxy(GameProxy, [mainAdmin, heroNFTInstance.address])
    const landNFTInstance = await deployProxy(LandNFT, [mainAdmin, 'FOTA LAND', 'LAND'])
    const treasuryInstance = await deployProxy(Treasury, [mainAdmin, landNFTInstance.address, landNFTInstance.address])
    const landLordManagerInstance = await initLandLordManager(accounts, fotaTokenInstance.address, pveInstance.address, fotaPricerInstance.address, landNFTInstance.address, treasuryInstance.address, gameProxyInstance.address, citizenInstance.address)
    await rewardManagerInstance.setContracts(heroNFTInstance.address, fotaTokenInstance.address, landLordManagerInstance.address, fotaFarmInstance.address, gameProxyInstance.address, fotaPricerInstance.address, citizenInstance.address, mainAdmin)
    await rewardManagerInstance.updateGameContract(mainAdmin, true)
    await heroNFTInstance.updateMintAdmin(rewardManagerInstance.address, true)
    await fotaTokenInstance.setGameAddress(rewardManagerInstance.address, true)
    await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
    await fotaFarmInstance.start(startTimeValue)
  }
  return rewardManagerInstance
}
async function initMarketPlaceV2Instance(accounts, options = undefined) {
  const {
    mainAdmin,
    user1
  } = util.getAccounts(accounts)
  if (options) {
    return deployProxy(MarketPlaceV2, ['FOTA', '1', mainAdmin, options.rewardManagerAddress, options.heroNftAddress, options.itemNftAddress, options.pveAddress])
  }
  const marketPlaceInstance = await deployProxy(MarketPlace, [mainAdmin])
  const energyManagerInstance = await initEnergyManagerInstance(accounts)
  const rewardManagerInstance = await initRewardManagerInstance(accounts, true)
  const heroNFTAddress = await rewardManagerInstance.heroNft()
  const fotaPricerInstance = await initFotaPricerInstance(accounts)
  const heroNFTInstance = await HeroNFT.at(heroNFTAddress)
  const itemNFTInstance = await initItemNFTInstance(accounts)
  const fotaAddress = await rewardManagerInstance.fotaToken()
  const fotaTokenInstance = await FOTAToken.at(fotaAddress)
  const pveInstance = await deployProxy(FOTAGamePVE, ['FOTA', '1', mainAdmin, energyManagerInstance.address, rewardManagerInstance.address, heroNFTInstance.address, itemNFTInstance.address, marketPlaceInstance.address])
  const marketPlaceV2Instance = await deployProxy(MarketPlaceV2, ['FOTA', '1', mainAdmin, rewardManagerInstance.address, heroNFTInstance.address, itemNFTInstance.address, pveInstance.address])
  await marketPlaceV2Instance.updateOrderTrustFee(value1BN)
  const { mbusdTokenInstance, musdtTokenInstance } = await initMockTokenInstance()
  await marketPlaceV2Instance.setContracts(rewardManagerInstance.address, heroNFTInstance.address, itemNFTInstance.address, pveInstance.address, fotaTokenInstance.address, mbusdTokenInstance.address, musdtTokenInstance.address, fotaPricerInstance.address)
  await itemNFTInstance.updateMintAdmin(mainAdmin, true)
  await itemNFTInstance.setFOTAPricer(fotaPricerInstance.address)
  await heroNFTInstance.updateMintAdmin(marketPlaceV2Instance.address, true)
  await rewardManagerInstance.updateContractAdmin(marketPlaceV2Instance.address)
  await rewardManagerInstance.storeDeposit([user1], [value1000BN])
  await rewardManagerInstance.setUserPrestigeShards(user1, 1)
  return marketPlaceV2Instance
}

async function initPVEInstance(accounts, options = undefined) {
  const {
    mainAdmin,
  } = util.getAccounts(accounts)
  let pveInstance
  const marketPlaceInstance = await deployProxy(MarketPlace, [
    mainAdmin,
    mainAdmin,
    mainAdmin,
    mainAdmin,
    mainAdmin,
    mainAdmin,
    mainAdmin
  ])
  const rewardManagerInstance = await initRewardManagerInstance(accounts, true)
  if (options) {
    pveInstance = await deployProxy(FOTAGamePVE, ['FOTA', '1', mainAdmin, options.energyManagerInstance.address, rewardManagerInstance.address, options.heroNFTInstance.address, options.itemNFTInstance.address, marketPlaceInstance.address])
  } else {
    const energyManagerInstance = await initEnergyManagerInstance(accounts)
    const heroNFTInstanceAddress = await rewardManagerInstance.heroNft()
    const heroNFTInstance = await HeroNFT.at(heroNFTInstanceAddress)
    const itemNFTInstance = await initItemNFTInstance(accounts)
    pveInstance = await deployProxy(FOTAGamePVE, ['FOTA', '1', mainAdmin, energyManagerInstance.address, rewardManagerInstance.address, heroNFTInstance.address, itemNFTInstance.address, marketPlaceInstance.address])
    const options = {
      rewardManagerAddress: rewardManagerInstance.address,
      heroNftAddress: heroNFTInstance.address,
      itemNftAddress: itemNFTInstance.address,
      pveAddress: pveInstance.address
    }
    const marketPlaceV2Instance = await initMarketPlaceV2Instance(mainAdmin, options)
    await pveInstance.setContracts(heroNFTInstance.address, itemNFTInstance.address, energyManagerInstance.address, rewardManagerInstance.address, marketPlaceInstance.address, marketPlaceV2Instance.address)
    await energyManagerInstance.updateGameContract(pveInstance.address, true)
    await energyManagerInstance.setContracts(heroNFTInstance.address)
    await energyManagerInstance.updateEnergyCondition(3)
    await heroNFTInstance.updateGameContract(pveInstance.address, true)
    await heroNFTInstance.updateProfitRate(300)
    await heroNFTInstance.updateExperienceCheckpoint(2, 20)
    await heroNFTInstance.updateMintAdmin(pveInstance.address, true)
    await rewardManagerInstance.updateGameContract(pveInstance.address, true)
    await rewardManagerInstance.updateTreasuryAddress(mainAdmin)
  }
  return pveInstance
}

// async function initLaunchPadHeroInstance(accounts) {
//   const maxTotalSupply = 150
//   const energyManagerInstance = await initEnergyManagerInstance(accounts)
//   const heroNFTInstance = await initHeroNFTInstance(accounts, energyManagerInstance.address, false)
//   await energyManagerInstance.updatePointContract(heroNFTInstance.address, true)
//   const launchPad = await LaunchPad.new();
//   const launchPadManager = await deployProxy(LaunchPadManager, [heroNFTInstance.address])
//   const gallerLaunchPadHero1 = await deployProxy(GallerLaunchPadHero, [launchPadManager.address, launchPad.address, 1, value1BN])
//   const gallerLaunchPadHero2 = await deployProxy(GallerLaunchPadHero, [launchPadManager.address, launchPad.address, 1, value1BN])
//   await launchPadManager.setLaunchPad(gallerLaunchPadHero1.address, true, maxTotalSupply)
//   await launchPadManager.setLaunchPad(gallerLaunchPadHero2.address, true, maxTotalSupply)
//   await heroNFTInstance.updateMintAdmin(launchPadManager.address, true)
//   const listingTime = moment().startOf('d').unix()
//   const expTime = moment().add(20, 'd').startOf('d').unix()
//   await launchPad.addCampaign(gallerLaunchPadHero1.address, accountsMap.mainAdmin, value1BN, listingTime, expTime, 10, 15)
//   await launchPad.addCampaign(gallerLaunchPadHero2.address, accountsMap.mainAdmin, value1BN, listingTime, expTime, 20, 30)
//   return {
//     launchPad,
//     gallerLaunchPadHero1,
//     gallerLaunchPadHero2,
//     launchPadManager
//   }
// }
//
// async function initLaunchPadHeroRandomInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const energyManagerInstance = await initEnergyManagerInstance(accounts)
//   const heroNFTInstance = await initHeroNFTInstance(accounts, energyManagerInstance.address, false)
//   await heroNFTInstance.addHeroClass('Foo2', 'Bar2', 'Lorem2', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
//   await heroNFTInstance.addHeroClass('Foo3', 'Bar3', 'Lorem3', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
//   await energyManagerInstance.updatePointContract(heroNFTInstance.address, true)
//   const launchPad = await LaunchPad.new();
//   const gallerLaunchPadHeroRandom = await deployProxy(GallerLaunchPadHeroRandom, [heroNFTInstance.address, launchPad.address, [1, 2, 3], value1BN])
//   await heroNFTInstance.setLaunchPad(150, gallerLaunchPadHeroRandom.address)
//   const listingTime = moment().startOf('d').unix()
//   const expTime = moment().add(20, 'd').startOf('d').unix()
//   await launchPad.addCampaign(gallerLaunchPadHeroRandom.address, accountsMap.mainAdmin, value1BN, listingTime, expTime, 10, 15)
//   await heroNFTInstance.updateMintAdmin(gallerLaunchPadHeroRandom.address, true)
//   return {
//     launchPad,
//     gallerLaunchPadHeroRandom
//   }
// }
//
// async function initEatherBonusInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const itemNFTInstance = await initItemNFTInstance(accounts)
//   const rewardManagerInstance = await initRewardManagerInstance(accounts)
//   const mLPTokenInstance = await MLPToken.new()
//   const eatherBonusInstance = await deployProxy(EatherBonus, ['FOTA', '1', itemNFTInstance.address, rewardManagerInstance.address, mLPTokenInstance.address])
//   const fotaPricerInstance = await initFotaPricerInstance(accounts)
//   await itemNFTInstance.updateMintAdmin(eatherBonusInstance.address, true)
//   await itemNFTInstance.addItemClass(0, 1, mainAdmin, [1, 1, 1, 1, 1, 1, 1])
//   await itemNFTInstance.setFOTAPricer(fotaPricerInstance.address)
//   await eatherBonusInstance.setNormalRate(99)
//   await eatherBonusInstance.setWhiteListRate(99)
//   return eatherBonusInstance
// }
//
//
// async function initSpinRandomHeroNftInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const energyManagerInstance = await initEnergyManagerInstance(accounts)
//   const FOTAPricerInstance = await initFotaPricerInstance(accounts)
//   const FOTATokenInstance = await initFotaTokenInstance(accounts)
//   const heroNFTInstance = await initHeroNFTInstance(accounts, energyManagerInstance.address, false)
//   await heroNFTInstance.addHeroClass('Foo2', 'Bar2', 'Lorem2', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
//   await heroNFTInstance.addHeroClass('Foo3', 'Bar3', 'Lorem3', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
//   await heroNFTInstance.addHeroClass('Foo4', 'Bar4', 'Lorem4', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
//   await heroNFTInstance.addHeroClass('Foo5', 'Bar5', 'Lorem5', [100, 100, 100, 100, 100, 100, 100], mainAdmin)
//   await energyManagerInstance.updatePointContract(heroNFTInstance.address, true)
//   const { mbusdTokenInstance, musdtTokenInstance } = await initMockTokenInstance()
//
//   const { mLPTokenInstance: lpToken } = await initMockTokenInstance()
//   const spinRandomHeroNftInstance = await deployProxy(SpinRandomHeroNft, ['FOTA', '1', mainAdmin, heroNFTInstance.address, lpToken.address, FOTAPricerInstance.address, 'spin random hero nft seed'])
//   await spinRandomHeroNftInstance.setPaymentCurrencyToken(mbusdTokenInstance.address, musdtTokenInstance.address, FOTATokenInstance.address);
//
//   return spinRandomHeroNftInstance
// }
//
// async function initEatherBonusInstance(accounts) {
//   const {
//     mainAdmin,
//   } = util.getAccounts(accounts)
//   const itemNFTInstance = await initItemNFTInstance(accounts)
//   const rewardManagerInstance = await initRewardManagerInstance(accounts)
//   const mLPTokenInstance = await MLPToken.new()
//   const eatherBonusInstance = await deployProxy(EatherBonus, ['FOTA', '1', itemNFTInstance.address, rewardManagerInstance.address, mLPTokenInstance.address])
//   const fotaPricerInstance = await initFotaPricerInstance(accounts)
//   await itemNFTInstance.updateMintAdmin(eatherBonusInstance.address, true)
//   await itemNFTInstance.addItemClass(0, 1, mainAdmin, [1, 1, 1, 1, 1, 1, 1])
//   await itemNFTInstance.setFOTAPricer(fotaPricerInstance.address)
//   await eatherBonusInstance.setNormalRate(99)
//   await eatherBonusInstance.setWhiteListRate(99)
//   return eatherBonusInstance
// }

module.exports = {
  initMarketPlaceV2Instance,
  initCitizenInstance,
  // initEatherBonusInstance,
  // initEatherSaleInstance,
  // initEnergyManagerInstance,
  // initFOTAFarmInstance,
  // initFotaPricerInstance,
  // initFotaTokenInstance,
  // initEatherTransporterInstance,
  initHeroNFTInstance,
  // initItemNFTInstance,
  // initItemUpgradingContract,
  // initItemUpgradingMapContract,
  // initLandLordManager,
  // initLaunchPadHeroInstance,
  // initLaunchPadHeroRandomInstance,
  // initMockTokenInstance,
  // initMarketPlaceInstance,
  // initDGGPrivateSaleInstance,
  // initPrivateSaleInstance,
  initPVEInstance,
  initRewardInstance,
  initRewardManagerInstance,
  // initSkillUpgradingContract,
  // initTreasuryInstance,
  // initWhitelistInstance,
  // initSpinRandomHeroNftInstance,
}
