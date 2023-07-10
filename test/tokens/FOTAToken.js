const util = require('../utils')
const contracts = require('../utils/contracts')
const {accountsMap, listenEvent, value1BN} = require('../utils')
const {catchRevertWithReason} = require('../utils/exceptions')

let liquidityPoolAddress
let fotaTokenInstance
let totalSupply

contract('FOTAToken', (accounts) => {
  beforeEach( async () => {
    fotaTokenInstance = await contracts.initFotaTokenInstance(accounts)
    liquidityPoolAddress = util.accountsMap.liquidityPoolAddress
  })
  it('1. Have correct name' , async () => {
    const name = await fotaTokenInstance.name()
    name.should.equal('Fight Of The Ages')
  })
  it('2. Have correct symbol' , async () => {
    const symbol = await fotaTokenInstance.symbol()
    symbol.should.equal('FOTA')
  })
  it('3. Have correct decimals' , async () => {
    const decimals = await fotaTokenInstance.decimals()
    decimals.should.be.a.bignumber.that.equals('18')
  })
  it('4. Have correct totalSupply at deployment time' , async () => {
    totalSupply = await fotaTokenInstance.totalSupply()
    totalSupply.should.be.a.bignumber.that.equals('0')
  })
  it('5. Should transfer totalSupply to liquidity pool address at deployment', async () => {
    const liquidityBalance = await fotaTokenInstance.balanceOf(liquidityPoolAddress)
    liquidityBalance.should.be.a.bignumber.that.equals(totalSupply)
  })
  it('6. Can update owner', async () => {
    await transferOwnership(accountsMap.user1, { from: accountsMap.mainAdmin })
  })
  it('7. Can update backup', async () => {
    await updateBackup(accountsMap.user1)
    await transferOwnership(accountsMap.user2, accountsMap.validAccount1Option)
  })
  it('8. owner can not update himself', async () => {
	  await fotaTokenInstance.transferOwnership(accountsMap.user1, { from: accountsMap.mainAdmin })
    await catchRevertWithReason(fotaTokenInstance.transferOwnership(accountsMap.user2, accountsMap.validAccount1Option), 'onlyBackup')
  })
  it('9. Can update paused', async () => {
    const currentPauseStatus = await fotaTokenInstance.paused()
    await fotaTokenInstance.updatePauseStatus(!currentPauseStatus)
    const newPauseStatus = await fotaTokenInstance.paused()
    newPauseStatus.should.be.equal(!currentPauseStatus)
  })
  it('10. Can not mint or transfer token when paused', async () => {
    await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
    await fotaTokenInstance.releaseGameAllocation(accountsMap.mainAdmin, value1BN)
    await fotaTokenInstance.updatePauseStatus(true)
    await catchRevertWithReason(fotaTokenInstance.releaseGameAllocation(accountsMap.mainAdmin, value1BN), 'You can not do this at the moment')
    await catchRevertWithReason(fotaTokenInstance.transfer(accountsMap.user1, value1BN), 'You can not do this at the moment')
  })
})

async function transferOwnership(user, backupOption) {
  const response = await fotaTokenInstance.transferOwnership(user, backupOption)
  listenEvent(response, 'OwnershipTransferred')
  const isOwner = await fotaTokenInstance.isOwner({ from: user })
  isOwner.should.be.true
}

async function updateBackup(user) {
  await fotaTokenInstance.updateBackup(user)
  const isBackup = await fotaTokenInstance.isBackup({ from: user })
  isBackup.should.be.true
}
