const FOTAToken = artifacts.require('./FOTAToken.sol')
const { listenEvent, accountsMap, getAccounts, BN, value200BN, value1000BN, value500BN } = require('./utils')
const timerHelper = require('./utils/timer')
const contracts = require('./utils/contracts')
const merkleTree = require('./utils/rewardMerkleTree')
let rewardInstance
let fotaTokenInstance
let path

contract('Reward', (accounts) => {
  describe('I. User functions', async () => {
    describe('A. Success', async () => {
      getAccounts(accounts)
      beforeEach(async () => {
        rewardInstance = await contracts.initRewardInstance(accounts)
        fotaTokenInstance = await loadFotaInstance()
        await fotaTokenInstance.setGameAddress(accountsMap.mainAdmin, true)
        await fundFota(rewardInstance.address)
        await rewardInstance.startVesting()
        const whiteList = [
          ['0x60905c43F99BDcCa0464eE86803D4c4c1B29adBb', value500BN],
          ['0x47E1FfF90c5e3F9e1016A3aB11d8ba25a991926a', value1000BN],
          ['0xAA8DCB8Ad7d1a56b6ea4B2D3B7b5cfb78EDdEbBE', value500BN],
          ['0xDa83D8Ab73608B0936cCC1Cfa88A6ef2Fc1147b1', value1000BN]
        ]
        path = await getPath(whiteList, '0x60905c43F99BDcCa0464eE86803D4c4c1B29adBb', value500BN)
        console.log('path', path)
        const path2 = await getPath(whiteList, '0x47E1FfF90c5e3F9e1016A3aB11d8ba25a991926a', value1000BN)
        console.log('path2', path2)
      })
      it('Can claim TGE', async () => {
        // let response = await rewardInstance.claim(value1000BN, path, accountsMap.validAccount1Option)
        // listenEvent(response, 'Claimed')
        // const balance1 = await fotaTokenInstance.balanceOf(accountsMap.user1)
        // balance1.should.be.a.bignumber.that.equal(value200BN)
        // const secondsInOneMonth = await rewardInstance.secondsInOneMonth()
        // await timerHelper.advanceTimeAndBlock(secondsInOneMonth.toNumber())
        // await rewardInstance.claim(value1000BN, path, accountsMap.validAccount1Option)
        // const balance2 = await fotaTokenInstance.balanceOf(accountsMap.user1)
        // balance2.should.be.a.bignumber.that.equal(balance1.add(new BN(web3.utils.toWei('160'))))
      })
    })
  })
})

async function loadFotaInstance() {
  const fotaAddress = await rewardInstance.fotaToken()
  return FOTAToken.at(fotaAddress)
}

async function fundFota(user) {
  await fotaTokenInstance.releaseGameAllocation(user, value1000BN)
}

async function getPath(whiteList, userAddress, allocated) {
  const tree = merkleTree.genMerkleTree(whiteList)
  console.log('tree.root.hash', tree.root.hash)
  await rewardInstance.setRootHash(tree.root.hash)
  return merkleTree.getMerklePath(tree, userAddress, allocated)
}
