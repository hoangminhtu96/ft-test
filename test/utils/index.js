const BN = require('bn.js')
const value1NegativeString = '-1000000000000000000'
const value1NegativeBN = new BN(value1NegativeString)
const value1String = '1000000000000000000'
const value1BN = new BN(value1String)
const value3String = '3000000000000000000'
const value3BN = new BN(value3String)
const value10String = '10000000000000000000'
const value10BN = new BN(value10String)
const value2String = '2000000000000000000'
const value2BN = new BN(value2String)
const value175String = '175000000000000000000'
const value175BN = new BN(value175String)
const value420MString = '420000000000000000000000000'
const value420MBN = new BN(value420MString)
const value50String = '50000000000000000000'
const value50BN = new BN(value50String)
const value90String = '90000000000000000000'
const value90BN = new BN(value90String)
const value100String = '100000000000000000000'
const value100BN = new BN(value100String)
const value200String = '200000000000000000000'
const value200BN = new BN(value200String)
const value180String = '180000000000000000000'
const value180BN = new BN(value180String)
const value150String = '150000000000000000000'
const value150BN = new BN(value150String)
const value500String = '500000000000000000000'
const value500BN = new BN(value500String)
const value1000String = '1000000000000000000000'
const value1000BN = new BN(value1000String)
const value5000String = '5000000000000000000000'
const value5000BN = new BN(value5000String)

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(BN))
  .should()

function to(promise) {
  return promise.then((data) => {
    return [null, data]
  }).catch((error) => {
    console.log('error form to func:', error)
    try {
      return [JSON.parse(error.message)]
    } catch (e) {
      return [error]
    }
  })
}

function listenEvent(response, eventName, index = 0) {
  let event = response.logs[index].event

  if (event.event !== eventName) {
    const logEvent = response.logs.filter(log => log.event == eventName)
    event = logEvent.length ? logEvent[0].event : event
  }

  assert.equal(event, eventName, eventName + ' event should fire.');
}

const accountsMap = {}

function getAccounts(accounts) {
  if (!accountsMap.mainAdmin) {
    accountsMap.zeroAddress = '0x0000000000000000000000000000000000000000'
    accountsMap.landNFTAddress = '0x0000000000000000000000000000000000000000'
    accountsMap.mainAdmin = accounts[0]
    accountsMap.contractAdmin = accounts[accounts.length - 1]
    accountsMap.liquidityPoolAddress = accounts[0]
    accountsMap.mainAdminOption = {
      from: accountsMap.mainAdmin
    }
    accountsMap.accountUnauthorizedOption = {
	    from: accounts[49]
    }
    accountsMap.validAccount1Option = {
	    from: accounts[1]
    }
    accountsMap.validAccount2Option = {
	    from: accounts[2]
    }
    for (let i = 1; i < accounts.length - 10; i += 1) {
      accountsMap[`user${i}`] = accounts[i]
    }
  }
  return accountsMap
}

function getTokenIdFromResponse(response, index = 0) {
  return response.receipt.logs[index].args.tokenId
}

module.exports = {
  getAccounts,
  accountsMap,
  BN,
  getTokenIdFromResponse,
  listenEvent,
  to,
  value1String,
  value1BN,
  value1NegativeBN,
  value10BN,
  value2BN,
  value3BN,
  value50BN,
  value100BN,
  value200BN,
  value175BN,
  value180BN,
  value420MBN,
  value500BN,
  value500String,
  value1000BN,
  value1000String,
  value5000BN,
  value5000String,
  value150BN,
  value90BN,
}
