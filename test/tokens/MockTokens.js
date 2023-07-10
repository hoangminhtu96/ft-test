const util = require('../utils')
const contracts = require('../utils/contracts')

contract('MBUSDToken', (accounts) => {
  let mbusdTokenInstance
  before( async () => {
    const data = await contracts.initMockTokenInstance()
    mbusdTokenInstance = data.mbusdTokenInstance
  })
  it('1. Have correct totalSupply at deployment time' , async () => {
    const totalSupply = await mbusdTokenInstance.totalSupply()
    const maxSupply = await mbusdTokenInstance.maxSupply()
    totalSupply.should.be.a.bignumber.that.equals(maxSupply)
  })
  it('5. Should transfer totalSupply to deployer address at deployment', async () => {
    const maxSupply = await mbusdTokenInstance.maxSupply()
    const mainAdminBalance = await mbusdTokenInstance.balanceOf(util.accountsMap.mainAdmin)
    mainAdminBalance.should.be.a.bignumber.that.equals(maxSupply)
  })
})

contract('MUSDTToken', (accounts) => {
  let musdtTokenInstance
  before( async () => {
    const data = await contracts.initMockTokenInstance(accounts)
    musdtTokenInstance = data.musdtTokenInstance
  })
  it('1. Have correct totalSupply at deployment time' , async () => {
    const totalSupply = await musdtTokenInstance.totalSupply()
    const maxSupply = await musdtTokenInstance.maxSupply()
    totalSupply.should.be.a.bignumber.that.equals(maxSupply)
  })
  it('5. Should transfer totalSupply to deployer address at deployment', async () => {
    const maxSupply = await musdtTokenInstance.maxSupply()
    const mainAdminBalance = await musdtTokenInstance.balanceOf(util.accountsMap.mainAdmin)
    mainAdminBalance.should.be.a.bignumber.that.equals(maxSupply)
  })
})
