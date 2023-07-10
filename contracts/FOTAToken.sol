// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./libs/zeppelin/token/BEP20/IBEP20.sol";
import "./libs/fota/TokenAuth.sol";

contract FOTAToken is IBEP20, TokenAuth {
  string public constant name = "Fight Of The Ages";
  string public constant symbol = "FOTA";
  uint public constant decimals = 6;

  uint public constant gamingAllocation = 455e12;
  uint public constant seedSaleAllocation = 105e11;
  uint public constant strategicSaleAllocation = 35e12;
  uint public constant privateSaleAllocation = 21e12;
  uint public constant ido1stAllocation = 7e12;
  uint public constant ido2ndAllocation = 35e11;
  uint public constant marketingAllocation = 28e12;
  uint public constant liquidityPoolAllocation = 35e12;

  uint public constant maxSupply = 700e12;
  uint public constant blockInOneMonth = 1296000; // 30 * 24 * 60 * 30
  uint public totalSupply;
  bool public paused;
  bool public lockingFunctionEnabled = true;
  uint8 public idoReleaseCounter;
  uint public lastReleaseMarketingBlock;
  uint public lastReleaseLiquidityPoolBlock;
  uint public startVestingMarketingBlock;
  uint public startVestingLiquidityPoolBlock;
  uint public startVestingFounderBlock;
  uint public startVestingAdvisorBlock;
  mapping (address => uint) public lastReleaseAdvisorBlocks;
  mapping (address => uint) public lastReleaseFounderBlocks;

  uint private gamingReleased;
  uint private seedSaleReleased;
  uint private strategicSaleReleased;
  uint private privateSaleReleased;

  bool releasePrivateSale;
  bool releaseIDO;
  bool releaseLiquidityPool;

  mapping (address => uint) internal _balances;
  mapping (address => mapping (address => uint)) private _allowed;
  mapping (address => bool) lock;

  constructor(address _liquidityPoolAddress) TokenAuth(msg.sender, _liquidityPoolAddress) {
    startVestingAdvisorBlock = 20277071;
  }

  function startVestingMarketing() onlyOwner external {
    require(startVestingMarketingBlock == 0, "VestingMarketing had started already");
    startVestingMarketingBlock = block.number;
    lastReleaseMarketingBlock = startVestingMarketingBlock + blockInOneMonth * 3;
  }

  function startVestingLiquidityPool() onlyOwner external {
    require(startVestingLiquidityPoolBlock == 0, "VestingLiquidityPool had started already");
    startVestingLiquidityPoolBlock = block.number;
    lastReleaseLiquidityPoolBlock = startVestingLiquidityPoolBlock + blockInOneMonth * 3;
    _mint(liquidityPoolAddress, liquidityPoolAllocation * 10 / 100);
  }

  function startVestingFounder() onlyOwner external {
    require(startVestingFounderBlock == 0, "VestingFounder had started already");
    startVestingFounderBlock = block.number;
  }

  function startVestingAdvisor() onlyOwner external {
    require(startVestingAdvisorBlock == 0, "VestingAdvisor had started already");
    startVestingAdvisorBlock = block.number;
  }

  function releaseGameAllocation(address _gamerAddress, uint _amount) external onlyGameContract returns (bool) {
    require(gamingReleased + _amount <= gamingAllocation, "Max gaming allocation had released");
    _mint(_gamerAddress, _amount);
    gamingReleased = gamingReleased + _amount;
    return true;
  }

  function releaseSeedSaleAllocation(address _buyerAddress, uint _amount) external onlySaleContract returns (bool) {
    require(seedSaleReleased + _amount <= seedSaleAllocation, "Max seed sale allocation had released");
    _mint(_buyerAddress, _amount);
    seedSaleReleased = seedSaleReleased + _amount;
    return true;
  }

  function releaseStrategicSaleAllocation(address _buyerAddress, uint _amount) external onlySaleContract returns (bool) {
    require(strategicSaleReleased + _amount <= strategicSaleAllocation, "Max strategic sale allocation had released");
    _mint(_buyerAddress, _amount);
    strategicSaleReleased = strategicSaleReleased + _amount;
    return true;
  }

  function releasePrivateSaleAllocation(address _buyerAddress, uint _amount) external onlySaleContract returns (bool) {
    require(privateSaleReleased + _amount <= privateSaleAllocation, "Max private sale allocation had released");
    _mint(_buyerAddress, _amount);
    privateSaleReleased = privateSaleReleased + _amount;
    return true;
  }

  function releaseIDOAllocation(address _address) external onlyOwner {
    require(!releaseIDO, "IDO Allocation had released");
    if (idoReleaseCounter == 0) {
      idoReleaseCounter++;
      _mint(_address, ido1stAllocation);
    } else {
      releaseIDO = true;
      _mint(_address, ido2ndAllocation);
    }
  }

  function releaseMarketing() external onlyMarketingAddress {
    require(startVestingMarketingBlock > 0 && block.number > startVestingMarketingBlock + blockInOneMonth * 3, "Please wait more time");
    uint maxBlockNumber = startVestingMarketingBlock + blockInOneMonth * 15;
    require(maxBlockNumber > lastReleaseMarketingBlock, "Marketing allocation had released");
    uint blockPass;
    if (block.number < maxBlockNumber) {
      blockPass = block.number - lastReleaseMarketingBlock;
	    lastReleaseMarketingBlock = block.number;
    } else {
      blockPass = maxBlockNumber - lastReleaseMarketingBlock;
	    lastReleaseMarketingBlock = maxBlockNumber;
    }
    uint releaseAmount = marketingAllocation * blockPass / (blockInOneMonth * 12);
    _mint(msg.sender, releaseAmount);
  }

  function releaseLiquidityPoolAllocation() external onlyLiquidityPoolAddress {
    require(startVestingLiquidityPoolBlock > 0 && block.number > startVestingLiquidityPoolBlock + blockInOneMonth * 3, "Please wait more time");
    uint maxBlockNumber = startVestingLiquidityPoolBlock + blockInOneMonth * 15;
    require(maxBlockNumber > lastReleaseLiquidityPoolBlock, "Liquidity pool allocation had released");
    uint blockPass;
    if (block.number < maxBlockNumber) {
      blockPass = block.number - lastReleaseLiquidityPoolBlock;
      lastReleaseLiquidityPoolBlock = block.number;
    } else {
      blockPass = maxBlockNumber - lastReleaseLiquidityPoolBlock;
      lastReleaseLiquidityPoolBlock = maxBlockNumber;
    }
    uint releaseAmount = liquidityPoolAllocation * 90 / 100 * blockPass / (blockInOneMonth * 12);
    _mint(msg.sender, releaseAmount);
  }

  function releaseFounderAllocation() external onlyFounderAddress {
    uint canReleaseAtBlock = startVestingFounderBlock + blockInOneMonth * 12;
    require(startVestingFounderBlock > 0 && block.number > canReleaseAtBlock, "Please wait more time");
    uint maxBlockNumber = startVestingFounderBlock + blockInOneMonth * 24;
    require(maxBlockNumber > lastReleaseFounderBlocks[msg.sender], "Founder allocation had released");
    if (lastReleaseFounderBlocks[msg.sender] == 0) {
      lastReleaseFounderBlocks[msg.sender] = canReleaseAtBlock;
    }
    uint blockPass;
    if (block.number < maxBlockNumber) {
      blockPass = block.number - lastReleaseFounderBlocks[msg.sender];
      lastReleaseFounderBlocks[msg.sender] = block.number;
    } else {
      blockPass = maxBlockNumber - lastReleaseFounderBlocks[msg.sender];
      lastReleaseFounderBlocks[msg.sender] = maxBlockNumber;
    }
    uint releaseAmount = founderAddresses[msg.sender] * blockPass / (blockInOneMonth * 12);
    _mint(msg.sender, releaseAmount);
  }

  function releaseAdvisorAllocation() external onlyAdvisorAddress {
    uint canReleaseAtBlock = startVestingAdvisorBlock + blockInOneMonth * 6;
    require(startVestingAdvisorBlock > 0 && block.number > canReleaseAtBlock, "Please wait more time");
    uint maxBlockNumber = startVestingAdvisorBlock + blockInOneMonth * 18;
    if (lastReleaseAdvisorBlocks[msg.sender] == 0) {
      lastReleaseAdvisorBlocks[msg.sender] = canReleaseAtBlock;
    }
    require(maxBlockNumber > lastReleaseAdvisorBlocks[msg.sender], "Advisor allocation had released");
    uint blockPass;
    if (block.number < maxBlockNumber) {
      blockPass = block.number - lastReleaseAdvisorBlocks[msg.sender];
      lastReleaseAdvisorBlocks[msg.sender] = block.number;
    } else {
      blockPass = maxBlockNumber - lastReleaseAdvisorBlocks[msg.sender];
      lastReleaseAdvisorBlocks[msg.sender] = maxBlockNumber;
    }
    uint releaseAmount = advisorAddresses[msg.sender] * blockPass / (blockInOneMonth * 12);
    _mint(msg.sender, releaseAmount);
  }

  function balanceOf(address _owner) override external view returns (uint) {
    return _balances[_owner];
  }

  function allowance(address _owner, address _spender) override external view returns (uint) {
    return _allowed[_owner][_spender];
  }

  function transfer(address _to, uint _value) override external returns (bool) {
    _transfer(msg.sender, _to, _value);
    return true;
  }

  function approve(address _spender, uint _value) override external returns (bool) {
    _approve(msg.sender, _spender, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint _value) override external returns (bool) {
    _transfer(_from, _to, _value);
    _approve(_from, msg.sender, _allowed[_from][msg.sender] - _value);
    return true;
  }

  function increaseAllowance(address _spender, uint _addedValue) external returns (bool) {
    _approve(msg.sender, _spender, _allowed[msg.sender][_spender] + _addedValue);
    return true;
  }

  function decreaseAllowance(address _spender, uint _subtractedValue) external returns (bool) {
    _approve(msg.sender, _spender, _allowed[msg.sender][_spender] - _subtractedValue);
    return true;
  }

  function burn(uint _amount) external {
    _balances[msg.sender] = _balances[msg.sender] - _amount;
    totalSupply = totalSupply - _amount;
    emit Transfer(msg.sender, address(0), _amount);
  }

  function updatePauseStatus(bool _paused) onlyOwner external {
    paused = _paused;
  }

  function updateLockStatus(address _address, bool _locked) onlyOwner external {
    require(lockingFunctionEnabled, "Locking function is disabled");
    lock[_address] = _locked;
  }

  function disableLockingFunction() onlyOwner external {
    lockingFunctionEnabled = false;
  }

  function checkLockStatus(address _address) external view returns (bool) {
    return lock[_address];
  }

  function updateFounderAddress(address _oldAddress, address _newAddress) public override {
    super.updateFounderAddress(_oldAddress, _newAddress);
    lastReleaseFounderBlocks[_newAddress] = lastReleaseFounderBlocks[_oldAddress];
    delete lastReleaseFounderBlocks[_oldAddress];
  }

  function updateAdvisorAddress(address _oldAddress, address _newAddress) public override {
    super.updateAdvisorAddress(_oldAddress, _newAddress);
    lastReleaseAdvisorBlocks[_newAddress] = lastReleaseAdvisorBlocks[_oldAddress];
    delete lastReleaseAdvisorBlocks[_oldAddress];
  }

  function _transfer(address _from, address _to, uint _value) private {
    _validateAbility(_from);
    _balances[_from] = _balances[_from] - _value;
    _balances[_to] = _balances[_to] + _value;
    if (_to == address(0)) {
      totalSupply = totalSupply - _value;
    }
    emit Transfer(_from, _to, _value);
  }

  function _approve(address _owner, address _spender, uint _value) private {
    require(_spender != address(0));
    require(_owner != address(0));

    _allowed[_owner][_spender] = _value;
    emit Approval(_owner, _spender, _value);
  }

  function _mint(address _owner, uint _amount) private {
    _validateAbility(_owner);
    require(totalSupply + _amount <= maxSupply, "Amount invalid");
    _balances[_owner] = _balances[_owner] + _amount;
    totalSupply = totalSupply + _amount;
    emit Transfer(address(0), _owner, _amount);
  }

  function _validateAbility(address _owner) private view {
    if (lockingFunctionEnabled) {
      require(!lock[_owner] && !paused, "You can not do this at the moment");
    } else {
      require(!paused, "You can not do this at the moment");
    }
  }
}

