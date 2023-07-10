const _ = require('lodash')
const HeroNFT = artifacts.require('./HeroNFT.sol')
const MUSDTToken = artifacts.require('./MUSDTToken.sol')
const MBUSDToken = artifacts.require('./MBUSDToken.sol')
const FOTAPricer = artifacts.require('./FOTAPricer.sol')
const FOTAToken = artifacts.require('./FOTAToken.sol')

const { BN, listenEvent, accountsMap, value1000BN, value5000BN, value1000String} = require('./utils')
const contracts = require('./utils/contracts')
const {
catchRevertWithReason,
} = require('./utils/exceptions.js')

let mbusdTokenInstance
let musdtTokenInstance
let spinRandomHeroNftInstance
let fotaTokenInstance
let fotaPricer
let heroNft

let inputDefaultData = ['collection 1', [1, 2, 3], [10000, 60000, 30000], [100, 120, 150], 1, 200]

const fotaCurrency = 0
const busdCurrency = 1
const usdtCurrency = 2
const fotaPaymentType = 0
const usdPaymentType = 1
const allPaymentType = 2

contract('Spin Random Hero NFT', (accounts) => {
  describe('I. Admin functions', async () => {
    describe('A. Success', async () => {
      beforeEach(async () => {
        spinRandomHeroNftInstance = await contracts.initSpinRandomHeroNftInstance(accounts)
      })

      it('Should create collection', async () => {
        const { name, numberHeroReceive, price, id } = await createCollection()

        name.should.be.equal(inputDefaultData[0])
        numberHeroReceive.should.be.a.bignumber.that.equals(`${inputDefaultData[4]}`)
        price.should.be.a.bignumber.that.equals(`${inputDefaultData[5]}`)

        const { classIds, rates, heroPrices } = await spinRandomHeroNftInstance.getCollectionDetail(id)
        expect(classIds.map(i => parseInt(i.toString()), 10)).to.have.all.members(inputDefaultData[1])
        expect(rates.map(i => parseInt(i.toString()), 10)).to.have.all.members(inputDefaultData[2])
        expect(heroPrices.map(i => parseInt(i.toString()), 10)).to.have.all.members(inputDefaultData[3])

        const isRateAscending = rates.every(function (rate, i) {
          return i === rates.length - 1 || parseInt(rate) > parseInt(rates[i + 1])
        })

        expect(isRateAscending).to.equal(true)
      })

      it('Should update collection info', async () => {
        const { id } = await createCollection()
        const input = ['new name', [1, 2, 3], [70000, 20000, 10000], [100, 100, 100], 1, 300]
        await spinRandomHeroNftInstance.updateCollection(id, ...input)
        await getCollectionDetail(id)
        const { classIds, rates, heroPrices, name, price, numberHeroReceive } = await spinRandomHeroNftInstance.getCollectionDetail(id)

        name.should.be.equal(input[0])
        expect(parseArrayBNToNumber(classIds), 10).to.eql(input[1])
        expect(parseArrayBNToNumber(rates)).to.eql(input[2])
        expect(parseArrayBNToNumber(heroPrices)).to.eql(input[3])
        numberHeroReceive.should.be.a.bignumber.to.that.equals(`${input[4]}`)
        price.should.be.a.bignumber.to.that.equals(`${input[5]}`)

        const isRateAscending = rates.every(function (rate, i) {
          return i === rates.length - 1 || parseInt(rate) > parseInt(rates[i + 1])
        })
        expect(isRateAscending).to.equal(true)
      })
    })

    describe('B. Fail', async () => {
      let user
      let userOption

      before(async () => {
        spinRandomHeroNftInstance = await contracts.initSpinRandomHeroNftInstance(accounts)
        fotaTokenInstance = await loadFotaInstance()
        heroNft = await loadHeroNftInstance()
        mbusdTokenInstance = await loadBusdInstance()
        musdtTokenInstance = await loadUsdtInstance()
        heroNft.updateMintAdmin(spinRandomHeroNftInstance.address, true)
        await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
        user = accountsMap.user1
        userOption = {
          from: user
        }
      })

      describe('Create collection', async () => {
        it('Should return error: invalid ClassIds or rate -- ClassIds invalid', async () => {
          const input = [...inputDefaultData]
          input[1] = [1, 2]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: invalid classIds or rate')
        })

        it('Should return error: can not update data', async () => {
          const { id } = await createCollection()

          await approveUSDToken(user, value5000BN)
          await fundUSD(user)

          await spinRandomHeroNftInstance.spin(id, busdCurrency, userOption)
          await catchRevertWithReason(spinRandomHeroNftInstance.updateCollection(id, ...inputDefaultData), `SpinRandomHeroNft: can't update data`)
        })

        it('Should return error: invalid class id', async () => {
          const input = [...inputDefaultData]
          input[1] = [3, 2, 1]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: invalid class id')
        })

        it('Should return error: class id not found', async () => {
          const input = [...inputDefaultData]
          input[1] = [99, 2, 1]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: class id not found')
        })

        it('Should return error: invalid ClassIds or rate -- rate invalid --> wrong rate percentage', async () => {
          const input = [...inputDefaultData]
          input[2] = [10, 101000, 30]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: rate must be great than 0 and less than or equal 100000')
        })

        it('Should return error: invalid ClassIds or rate -- rate invalid --> rate = 0', async () => {
          const input = [...inputDefaultData]
          input[2] = [0, 70000, 30000]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: rate must be great than 0 and less than or equal 100000')
        })

        it('Should return error: invalid number hero receive', async () => {
          const input = [...inputDefaultData]
          input[2] = [10000, 40000, 50000]
          input[4] = 5
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: invalid number hero receive')
        })

        it('Should return error: invalid total rate - total rate < numberHeroReceive * 100000', async () => {
          const input = [...inputDefaultData]
          input[4] = 1
          input[2] = [10000, 50000, 30000]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: invalid total rate')
        })

        it('Should return error: invalid total rate - total rate > numberHeroReceive * 100000', async () => {
          const input = [...inputDefaultData]
          input[4] = 1
          input[2] = [20000, 60000, 30000]
          await catchRevertWithReason(createCollection(input), 'SpinRandomHeroNft: invalid total rate')
        })
      })
    })
  })

  describe('II. User functions', async () => {
    describe('A. Success', async () => {
      let collectionId
      let user
      let collectionDetail
      let userOption

      beforeEach(async () => {
        spinRandomHeroNftInstance = await contracts.initSpinRandomHeroNftInstance(accounts)
        fotaTokenInstance = await loadFotaInstance()
        fotaPricer = await loadFotaPricerInstance()
        heroNft = await loadHeroNftInstance()
        mbusdTokenInstance = await loadBusdInstance()
        musdtTokenInstance = await loadUsdtInstance()
        heroNft.updateMintAdmin(spinRandomHeroNftInstance.address, true)
        await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
        const { id } = await createCollection()
        collectionId = id
        collectionDetail = await getCollectionDetail(collectionId)
        user = accountsMap.user1
        userOption = {
          from: user
        }
      })

      it('Should spin - spin one time', async () => {
        const input = [...inputDefaultData]
        const heroNumberReceive = 2
        input[4] = heroNumberReceive
        input[2] = [100000, 50000, 50000]
        const { id: collectionId } = await createCollection(input)

        await approveFota(user, value5000BN)
        await fundFota(user)
        const countHeroNftBefore = (await heroNft.getOwnerHeroes(user)).length

        const response = await spinRandomHeroNftInstance.spin(collectionId, fotaCurrency, userOption)
        const heroAfter = await heroNft.getOwnerHeroes(user)
        const countHeroNftAfter = heroAfter.length

        listenEvent(response, 'SpinBonus')
        countHeroNftAfter.should.be.equal(heroNumberReceive + countHeroNftBefore)

        let { heroClassIds } = response.logs[0].args
        heroClassIds = _.uniq(heroClassIds)

        expect(heroClassIds.length).to.equal(heroNumberReceive)

        for (let i = 0; i < countHeroNftAfter; i++) {
          const heroInfo = await heroNft.heroes(heroAfter[i])

          const detectHeroInputIndex = input[1].findIndex(i => i === parseInt(heroInfo.id.toString(), 10))
          expect(`${input[1][detectHeroInputIndex]}`).to.equal(heroInfo.id.toString())
          expect(`${input[3][detectHeroInputIndex]}`).to.equal(heroInfo.ownPrice.toString())
          expect(heroInfo.level.toString()).to.equal('1')
        }
      })

      it('Should spin - spin many time', async () => {
        const input = [...inputDefaultData]
        const heroNumberReceive = 1
        input[4] = heroNumberReceive
        const { id: collectionId } = await createCollection(input)
        const spinNumber = 2

        await approveFota(user, value5000BN)
        await fundFota(user)
        const countHeroNftBefore = await heroNft.getOwnerHeroes(user)

        let response
        for (let i = 0; i < spinNumber; i++) {
          response = await spinRandomHeroNftInstance.spin(collectionId, fotaCurrency, userOption)
        }

        const heroAfter = await heroNft.getOwnerHeroes(user)
        const countHeroNftAfter = heroAfter.length

        listenEvent(response, 'SpinBonus')
        countHeroNftAfter.should.be.equal(heroNumberReceive * spinNumber + (+countHeroNftBefore))

        let { heroClassIds } = response.logs[0].args
        heroClassIds = _.uniq(heroClassIds)

        expect(heroClassIds.length).to.equal(heroNumberReceive)

        for (let i = 0; i < countHeroNftAfter; i++) {
          const heroInfo = await heroNft.heroes(heroAfter[i])

          const detectHeroInputIndex = input[1].findIndex(i => i === parseInt(heroInfo.id.toString(), 10))
          expect(`${input[1][detectHeroInputIndex]}`).to.equal(heroInfo.id.toString())
          expect(`${input[3][detectHeroInputIndex]}`).to.equal(heroInfo.ownPrice.toString())
          expect(heroInfo.level.toString()).to.equal('1')
        }
      })

      it('Should spin - by busd currency', async () => {
        const input = [...inputDefaultData]
        const heroNumberReceive = 2
        input[4] = heroNumberReceive
        input[2] = [100000, 30000, 70000]
        const { id: collectionId } = await createCollection(input)

        await approveUSDToken(user, value5000BN)
        await fundUSD(user)
        const countHeroNftBefore = (await heroNft.getOwnerHeroes(user)).length

        const response = await spinRandomHeroNftInstance.spin(collectionId, busdCurrency, userOption)
        const heroAfter = await heroNft.getOwnerHeroes(user)
        const countHeroNftAfter = heroAfter.length

        listenEvent(response, 'SpinBonus')
        countHeroNftAfter.should.be.equal(heroNumberReceive + countHeroNftBefore)

        let { heroClassIds } = response.logs[0].args
        heroClassIds = _.uniq(heroClassIds)

        expect(heroClassIds.length).to.equal(heroNumberReceive)

        for (let i = 0; i < countHeroNftAfter; i++) {
          const heroInfo = await heroNft.heroes(heroAfter[i])

          const detectHeroInputIndex = input[1].findIndex(i => i === parseInt(heroInfo.id.toString(), 10))
          expect(`${input[1][detectHeroInputIndex]}`).to.equal(heroInfo.id.toString())
          expect(`${input[3][detectHeroInputIndex]}`).to.equal(heroInfo.ownPrice.toString())
          expect(heroInfo.level.toString()).to.equal('1')
        }
      })

      it('Should spin - by usdt currency', async () => {
        const input = [...inputDefaultData]
        const heroNumberReceive = 2
        input[4] = heroNumberReceive
        input[2] = [100000, 30000, 70000]
        const { id: collectionId } = await createCollection(input)

        await approveUSDToken(user, value5000BN)
        await fundUSD(user)
        const countHeroNftBefore = (await heroNft.getOwnerHeroes(user)).length

        const response = await spinRandomHeroNftInstance.spin(collectionId, usdtCurrency, userOption)
        const heroAfter = await heroNft.getOwnerHeroes(user)
        const countHeroNftAfter = heroAfter.length

        listenEvent(response, 'SpinBonus')
        countHeroNftAfter.should.be.equal(heroNumberReceive + countHeroNftBefore)

        let { heroClassIds } = response.logs[0].args
        heroClassIds = _.uniq(heroClassIds)

        expect(heroClassIds.length).to.equal(heroNumberReceive)

        for (let i = 0; i < countHeroNftAfter; i++) {
          const heroInfo = await heroNft.heroes(heroAfter[i])

          const detectHeroInputIndex = input[1].findIndex(i => i === parseInt(heroInfo.id.toString(), 10))
          expect(`${input[1][detectHeroInputIndex]}`).to.equal(heroInfo.id.toString())
          expect(`${input[3][detectHeroInputIndex]}`).to.equal(heroInfo.ownPrice.toString())
          expect(heroInfo.level.toString()).to.equal('1')
        }
      })
    })

    describe('B. Fail', async () => {
      let user
      let userOption

      beforeEach(async () => {
        spinRandomHeroNftInstance = await contracts.initSpinRandomHeroNftInstance(accounts)
        fotaTokenInstance = await loadFotaInstance()
        heroNft = await loadHeroNftInstance()
        await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
        await heroNft.updateMintAdmin(spinRandomHeroNftInstance.address, true)
        await createCollection()
        user = accountsMap.user1
        userOption = { from: user }
      })

      describe('Spin error', async () => {
        it('Should return error: collection not found', async () => {
          await catchRevertWithReason(spinRandomHeroNftInstance.spin(3, fotaCurrency, userOption), 'SpinRandomHeroNft: collection not found')
        })

        it('Should return error: invalid currency -- paymentType: usd -- currency fota ', async () => {
          const { id } = await createCollection()
          await spinRandomHeroNftInstance.updatePaymentType(usdPaymentType)
          await catchRevertWithReason(spinRandomHeroNftInstance.spin(id, fotaCurrency, userOption), 'SpinRandomHeroNft: invalid currency')
        })

        it('Should return error: invalid currency -- paymentType: fota -- currency busd ', async () => {
          const { id } = await createCollection()
          await spinRandomHeroNftInstance.updatePaymentType(fotaPaymentType)
          await catchRevertWithReason(spinRandomHeroNftInstance.spin(id, busdCurrency, userOption), 'SpinRandomHeroNft: invalid currency')
        })

        it('Should return error: invalid currency -- paymentType: fota -- currency usdt ', async () => {
          const { id } = await createCollection()
          await spinRandomHeroNftInstance.updatePaymentType(fotaPaymentType)
          await catchRevertWithReason(spinRandomHeroNftInstance.spin(id, usdtCurrency, userOption), 'SpinRandomHeroNft: invalid currency')
        })

        it('Should return error: approve token first', async () => {
          const { id } = await createCollection()
          await catchRevertWithReason(spinRandomHeroNftInstance.spin(id, fotaCurrency), 'SpinRandomHeroNft: please approve token first')
        })

        it('Should return error: insufficient balance', async () => {
          const { id } = await createCollection()
          await fotaTokenInstance.approve(spinRandomHeroNftInstance.address, value5000BN)
          await catchRevertWithReason(spinRandomHeroNftInstance.spin(id, fotaCurrency), ' SpinRandomHeroNft: please fund your account')
        })
      })
    })
  })
})

async function createCollection(data = inputDefaultData) {
  const response = await spinRandomHeroNftInstance.createCollection(...data)
  listenEvent(response, 'CollectionCreated')
  const collectionId = response.logs[0].args[0].toString()
  const { name, numberHeroReceive, price } = await getCollectionDetail(collectionId)

  return {
    id: collectionId,
    name,
    numberHeroReceive,
    price,
    response
  }
}

async function getCollectionDetail(collectionId) {
  return spinRandomHeroNftInstance.collections(collectionId)
}

async function approveFota(user, approveAmount) {
  const userOption = {
    from: user
  }
  const fotaTokenInstance = await loadFotaInstance()
  await fotaTokenInstance.approve(spinRandomHeroNftInstance.address, approveAmount, userOption)
  const allowance = await fotaTokenInstance.allowance(user, spinRandomHeroNftInstance.address)
  allowance.should.be.a.bignumber.that.equals(approveAmount)
}

async function approveUSDToken(user, approveAmount) {
  const userOption = {
    from: user
  }
  const mbusdTokenInstance = await loadBusdInstance()
  const musdtTokenInstance = await loadUsdtInstance()
  await mbusdTokenInstance.approve(spinRandomHeroNftInstance.address, approveAmount, userOption)
  await musdtTokenInstance.approve(spinRandomHeroNftInstance.address, approveAmount, userOption)

  const allowanceBusd = await mbusdTokenInstance.allowance(user, spinRandomHeroNftInstance.address)
  const allowanceUsdt = await musdtTokenInstance.allowance(user, spinRandomHeroNftInstance.address)

  allowanceBusd.should.be.a.bignumber.that.equals(approveAmount)
  allowanceUsdt.should.be.a.bignumber.that.equals(approveAmount)
}

async function fundUSD(user) {
  const mbusdTokenInstance = await loadBusdInstance()
  const musdtTokenInstance = await loadUsdtInstance()

  await mbusdTokenInstance.mint(user, value1000BN)
  await musdtTokenInstance.mint(user, value1000BN)

  const busdBalance = await mbusdTokenInstance.balanceOf(user)
  const usdtBalance = await musdtTokenInstance.balanceOf(user)

  busdBalance.should.be.a.bignumber.that.equals(value1000String)
  usdtBalance.should.be.a.bignumber.that.equals(value1000String)
}

async function loadFotaInstance() {
  const fotaAddress = await spinRandomHeroNftInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function loadHeroNftInstance() {
  const heroNftAddress = await spinRandomHeroNftInstance.heroNFT()
  return HeroNFT.at(heroNftAddress)
}

async function loadFotaPricerInstance() {
  const fotaPricerInstanceAddress = await spinRandomHeroNftInstance.fotaPricer()
  return FOTAPricer.at(fotaPricerInstanceAddress)
}

async function loadUsdtInstance() {
  const usdtAddress = await spinRandomHeroNftInstance.usdtToken()
  return MUSDTToken.at(usdtAddress)
}

async function loadBusdInstance() {
  const busdAddress = await spinRandomHeroNftInstance.busdToken()
  return MBUSDToken.at(busdAddress)
}

async function fundFota(user) {
  const fotaTokenInstanceInstance = await loadFotaInstance()
  await fotaTokenInstanceInstance.releaseGameAllocation(user, value1000BN)
  const balance = await fotaTokenInstanceInstance.balanceOf(user)
  balance.should.be.a.bignumber.that.equals(value1000String)
}

function parseArrayBNToNumber(array) {
  return array.map(arr => parseInt(arr.toString(), 10))
}
