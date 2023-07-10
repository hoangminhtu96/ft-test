# FOTA dapp

## Development

### Compile
```
truffle compile
```

### migrate to local chain
```
truffle migrate
```

### test
```
truffle test
```
To run specific test:
```
truffle test [path/to/test/file.ext]

ex:
truffle test ./test/StringUtil.js
```

### Remove ganache data
```
rm -rf ~/Library/Application\ Support/Ganache
```

## Deployment
### Deploy to public chain (testnet or mainnet)
```
truffle migrate --network [netWorkName]
```
netWordName=`testnet`, `mainnet` (see `truffle-config.js` file)

### Verifying code
If deploy via @openzeppelin/truffle-upgrades: deployProxy(TokenContractName, [params], { deployer })
```
truffle run verify {contract_name}@{address} --network {network}
truffle run verify MarketOlace@0x60CF4c5337572611926c2E59371Dc8F1c5e95a34 --network testnet
```

If deploy directly: deployer.deploy(TokenContractName)
```
truffle run verify {contract_name} {other_contract_name} --network {network}
truffle run verify TokenContractName AnotherTokenContractName --network testnet
truffle run verify MBUSDToken MUSDTToken --network testnet
truffle run verify EatherSale@0x724a558B668eDfF4249928498C4184d40243EE3d --network testnet
truffle run verify HeroNFT@0x3Dd30B0D31aa1d5faAE4E9a13820004351260DA1 ItemNFT@0xcbF8186adf4C23c611307B993EDaceF164682190 --network testnet
```
token: https://bscscan.com/address/0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4#contracts
private proxy: https://bscscan.com/address/0x1ddB673873FeCBCEe05A3F424a6528d956c4B6c9#code
private code: https://bscscan.com/address/0x40a80000d5CADa0A03F8fAC8931eEBD8D4Eedc54#code
seed proxy: https://bscscan.com/address/0xe4D810feb232eA08373a79A826b4955D72732f10#code
seed code: https://bscscan.com/address/0x9d13B363D0349681F397570673E68006890CdDf8#code
strategic proxy: https://bscscan.com/address/0x6dC21054A413BE08E8d8bb6ce1B87358D0e3C9E3#code
strategic code: https://bscscan.com/address/0x0d9D43618e695Fbc3116E59CF456381fC0330A8F#code
truffle migrate --network testnet --reset && truffle run verify HeroNFT EnergyManager --network testnet

Mapping upgrade contract testnet for game team:
HeroNFT, MarketPlace
cp .openzeppelin/unknown-97.json.daddyy3 .openzeppelin/unknown-97.json
cp .openzeppelin/unknown-97.json .openzeppelin/unknown-97.json.daddyy3
FOTAGamePVE => unknown-97.json.binh
RewardManager, EnergyManager
cp .openzeppelin/unknown-97.json.daddyy .openzeppelin/unknown-97.json
cp .openzeppelin/unknown-97.json .openzeppelin/unknown-97.json.daddyy

dev 3
cp .openzeppelin/unknown-97.dev3.json .openzeppelin/unknown-97.json
cp .openzeppelin/unknown-97.json .openzeppelin/unknown-97.dev3.json
