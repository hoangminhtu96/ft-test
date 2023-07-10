// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../libs/fota/RewardAuth.sol";
import "../interfaces/IGameMiningPool.sol";
import "../interfaces/IFOTAGame.sol";
import "../interfaces/ICitizen.sol";
import "../interfaces/IFOTAPricer.sol";
import "../interfaces/IGameNFT.sol";
import "../libs/fota/Math.sol";
import "../interfaces/IFarm.sol";
import "../interfaces/IFOTAToken.sol";
import "../interfaces/ILandLordManager.sol";

contract RewardManager is RewardAuth, PausableUpgradeable {
  using Math for uint;
  enum PaymentType {
    fota,
    usd,
    all,
    other
  }
  enum PaymentCurrency {
    fota,
    busd,
    usdt,
    other
  }

  IGameNFT public heroNft;
  IGameMiningPool public gameMiningPool;
  IFOTAGame public gameProxyContract;
  ICitizen public citizen;
  IFOTAPricer public fotaPricer;
  IFarm public farm;
  IFOTAToken public fotaToken;
  IBEP20 public busdToken;
  IBEP20 public usdtToken;
  PaymentType public paymentType;
  address public fundAdmin;
  ILandLordManager public landLordManager;
  uint public farmShare; // decimal 3
  uint public referralShare; // decimal 3
  uint public landLordShare; // decimal 3
  uint public dailyQuestReward;
  address public treasuryAddress;
  mapping (address => uint) public userRewards;
  mapping (address => uint) public userPrestigeShards;
  uint public treasuryShareAmount;
  uint public farmShareAmount;
  uint constant oneHundredPercentageDecimal3 = 100000;
  uint public prestigeShardCheckpoint;
  uint public gemRate;
  IBEP20 public otherPayment;
  uint[4] private discounts; // decimal 3
  address public storeAdmin;
  uint public gemDepositingStep;

  event DiscountUpdated(uint[4] discounts);
  event GemRateUpdated(uint gemRate, uint timestamp);
  event Deposited(address indexed user, uint amount, uint discount, uint timestamp, PaymentCurrency paymentCurrency, uint amountOfCurrency);
  event PaymentTypeUpdated(PaymentType newMethod);
  event PrestigeShardCheckpointUpdated(uint prestigeShardCheckpoint, uint timestamp);
  event ShareUpdated(uint referralShare, uint farmShare, uint landLordShare);
  event StoreDeposited(address[] users, uint[] amounts, uint timestamp);
  event BonusGave(address[] users, uint[] amounts, uint timestamp);
  event UserRewardChanged(address indexed user, int amount, uint remainingAmount);

  function initialize(address _mainAdmin, address _citizen, address _fotaPricer) public initializer {
    super.initialize(_mainAdmin);
    citizen = ICitizen(_citizen);
    fotaPricer = IFOTAPricer(_fotaPricer);
    fotaToken = IFOTAToken(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
//    gameMiningPool = IFOTAToken(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4); // TODO use this on mainnet deploy
    farmShare = 3000;
    referralShare = 2000;
    landLordShare = 1000;

    busdToken = IBEP20(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56);
    usdtToken = IBEP20(0x55d398326f99059fF775485246999027B3197955);
  }

  // _data: 0: userReward, 1: prestigeShard, 2: referralReward, 3: farmShare, 4: biggestFinishMission, 5: timestamp, 6->n: landLord
  function addPVEReward(address _user, uint[] memory _data) external onlyGameContract {
    // add user reward
    userRewards[_user] += _data[0];
    userPrestigeShards[_user] += _data[1];
    // inviter or treasury
    address inviterOrTreasury = citizen.getInviter(_user);
    if (inviterOrTreasury == address(0)) {
      inviterOrTreasury = treasuryAddress;
    }
    bool validInviter = gameProxyContract.validateInviter(inviterOrTreasury);
    if (validInviter) {
      userRewards[inviterOrTreasury] += _data[2];
    } else {
      treasuryShareAmount += _data[2];
    }
    // farm
    farmShareAmount += _data[3];
    // land lord
    uint halfLandlordLength = (_data.length - 6) / 2;
    uint endForLoop = 5 + halfLandlordLength;
    for(uint i = 6; i <= endForLoop; i++) {
      landLordManager.giveReward(_data[i], _data[i + halfLandlordLength]);
    }
    emit UserRewardChanged(_user, int(_data[0]), userRewards[_user]);
  }

  function addPVPReward(address _user, int gem) external onlyGameContract {
    if (gem > 0) {
      userRewards[_user] += uint(gem);
    } else {
      userRewards[_user] -= uint(gem * -1);
    }
    emit UserRewardChanged(_user, gem, userRewards[_user]);
  }

  function deposit(uint _amount, PaymentCurrency _paymentCurrency) external whenNotPaused {
    require(gemDepositingStep > 0, "Invalid step");
    require(_amount >= 0 && _amount % gemDepositingStep == 0, "Invalid amount");
    uint fundAmountInDollar = _amount / gemRate; // _amount is in GEM decimal 18, need to convert to $ before take fund
    uint discount;
    uint amountOfCurrency;
    if(_paymentCurrency == PaymentCurrency.fota) {
      discount = discounts[0];
      amountOfCurrency = _convertUsdToFota(fundAmountInDollar) * (oneHundredPercentageDecimal3 - discount) / oneHundredPercentageDecimal3;
      _takeFund(amountOfCurrency, _paymentCurrency);
    } else if(_paymentCurrency == PaymentCurrency.busd) {
      discount = discounts[1];
      amountOfCurrency = fundAmountInDollar * (oneHundredPercentageDecimal3 - discount) / oneHundredPercentageDecimal3;
      _takeFund(amountOfCurrency, _paymentCurrency);
    } else if(_paymentCurrency == PaymentCurrency.usdt) {
      discount = discounts[2];
      amountOfCurrency = fundAmountInDollar * (oneHundredPercentageDecimal3 - discount) / oneHundredPercentageDecimal3;
      _takeFund(amountOfCurrency, _paymentCurrency);
    } else {
      require(address(otherPayment) != address(0), "RewardManager: not supported for now");
      discount = discounts[3];
      amountOfCurrency = fundAmountInDollar * (oneHundredPercentageDecimal3 - discount) / oneHundredPercentageDecimal3;
      _takeFund(amountOfCurrency, _paymentCurrency);
    }
    userRewards[msg.sender] += _amount;
    emit Deposited(msg.sender, _amount, discount, block.timestamp, _paymentCurrency, amountOfCurrency);
  }

  function getDiscounts() external view returns (uint[4] memory) {
    return discounts;
  }

  // ADMIN FUNCTIONS
  modifier onlyStoreAdmin() {
    require(_isStoreAdmin(), "onlyStoreAdmin");
    _;
  }

  function updateStoreAdmin(address _newAdmin) onlyMainAdmin external {
    require(_newAdmin != address(0x0));
    storeAdmin = _newAdmin;
  }

  function updateGemDepositingStep(uint _gemDepositingStep) onlyMainAdmin external {
    require(_gemDepositingStep > 0, "Invalid step");
    gemDepositingStep = _gemDepositingStep;
  }

  function _isStoreAdmin() public view returns (bool) {
    return msg.sender == storeAdmin;
  }

  function storeDeposit(address[] calldata _users, uint[] calldata _amounts) external onlyStoreAdmin {
    for (uint i = 0; i < _users.length; i++) {
      userRewards[_users[i]] += _amounts[i];
    }
    emit StoreDeposited(_users, _amounts, block.timestamp);
  }

  function bonus(address[] calldata _users, uint[] calldata _amounts) external onlyContractAdmin {
    for (uint i = 0; i < _users.length; i++) {
      userRewards[_users[i]] += _amounts[i];
    }
    emit BonusGave(_users, _amounts, block.timestamp);
  }

  function updatePaymentType(PaymentType _type) external onlyMainAdmin {
    paymentType = _type;
    emit PaymentTypeUpdated(_type);
  }

  function updateTreasuryAddress(address _newAddress) external onlyMainAdmin {
    require(_newAddress != address(0), "Invalid address");
    treasuryAddress = _newAddress;
  }

  function updateFundAdmin(address _address) external onlyMainAdmin {
    require(_address != address(0));
    fundAdmin = _address;
  }

  function updateDiscounts(uint[4] calldata _discounts) external onlyMainAdmin {
    for (uint i = 0; i < _discounts.length; i++) {
      require(_discounts[i] >= 0 && _discounts[i] <= oneHundredPercentageDecimal3, "Invalid data");
    }
    discounts = _discounts;
    emit DiscountUpdated(discounts);
  }

  function updatePrestigeShardCheckpoint(uint _prestigeShardCheckpoint) external onlyMainAdmin {
    prestigeShardCheckpoint = _prestigeShardCheckpoint;
    emit PrestigeShardCheckpointUpdated(prestigeShardCheckpoint, block.timestamp);
  }

  function updateGemRate(uint _gemRate) external onlyMainAdmin {
    gemRate = _gemRate;
    emit GemRateUpdated(_gemRate, block.timestamp);
  }

  function setShares(uint _referralShare, uint _farmShare, uint _landLordShare) external onlyMainAdmin {
    require(_referralShare > 0 && _referralShare <= 10000);
    referralShare = _referralShare;
    require(_farmShare > 0 && _farmShare <= 10000);
    farmShare = _farmShare;
    require(_landLordShare > 0 && _landLordShare <= 10000);
    landLordShare = _landLordShare;
    emit ShareUpdated(referralShare, farmShare, landLordShare);
  }

  function setContracts(address _heroNft, address _fotaToken, address _landLordManager, address _farmAddress, address _gameProxyContract, address _fotaPricer, address _citizen, address _gameMiningPool) external onlyMainAdmin {
    heroNft = IGameNFT(_heroNft);
    fotaToken = IFOTAToken(_fotaToken);
    landLordManager = ILandLordManager(_landLordManager);
    gameProxyContract = IFOTAGame(_gameProxyContract);
    fotaPricer = IFOTAPricer(_fotaPricer);
    citizen = ICitizen(_citizen);
    gameMiningPool = IGameMiningPool(_gameMiningPool);
    require(_farmAddress != address(0), "Invalid address");
    farm = IFarm(_farmAddress);
    fotaToken.approve(_landLordManager, type(uint).max);
    fotaToken.approve(_farmAddress, type(uint).max);
  }

  function updatePauseStatus(bool _paused) external onlyMainAdmin {
    if(_paused) {
      _pause();
    } else {
      _unpause();
    }
  }

  function useTreasuryShareAmount(uint _amount) external onlyMainAdmin {
    require(_amount <= treasuryShareAmount, "Data invalid");
    treasuryShareAmount -= _amount;
    gameMiningPool.releaseGameAllocation(treasuryAddress, _convertUsdToFota(_amount / gemRate));
  }

  function useFarmShareAmount(uint _amount) external onlyMainAdmin {
    require(_amount <= farmShareAmount, "Data invalid");
    farmShareAmount -= _amount;
    uint distributedToFarm = _convertUsdToFota(_amount / gemRate);
    gameMiningPool.releaseGameAllocation(address(this), distributedToFarm);
    farm.fundFOTA(distributedToFarm);
  }

  function summonHero(address _user, uint _heroGemFee) external onlyContractAdmin {
    require(userRewards[_user] >= _heroGemFee, "RewardManager: insufficient balance");
    userRewards[_user] -= _heroGemFee;
    emit UserRewardChanged(_user, int(_heroGemFee) * -1, userRewards[_user]);
  }

  function summonPrestigeHero(address _user, uint _heroGameFee) external onlyContractAdmin {
    require(userRewards[_user] >= _heroGameFee, "RewardManager: insufficient balance");
    require(userPrestigeShards[_user] > 0, "RewardManager: insufficient prestige shard balance");
    userRewards[_user] -= _heroGameFee;
    userPrestigeShards[_user] -= 1;
    emit UserRewardChanged(_user, int(_heroGameFee) * -1, userRewards[_user]);
  }

  // TODO for testing purpose only

  function setUserPrestigeShards(address _user, uint _amount) external onlyMainAdmin {
    userPrestigeShards[_user] = _amount;
  }

  function setPaymentCurrencyToken(address _busd, address _usdt, address _fota, address _other) external onlyMainAdmin {
    require(_busd != address(0) && _usdt != address(0) && _fota != address(0), "RewardManager: invalid address");

    busdToken = IBEP20(_busd);
    usdtToken = IBEP20(_usdt);
    fotaToken = IFOTAToken(_fota);
    otherPayment = IBEP20(_other);
  }

  // PRIVATE FUNCTIONS

  function _convertUsdToFota(uint _amount) private view returns (uint) {
    return _amount * 1000 / fotaPricer.fotaPrice();
  }

  function _takeFund(uint _amount, PaymentCurrency _paymentCurrency) private {
    if (paymentType == PaymentType.fota) {
      _takeFundFOTA(_amount);
    } else if (paymentType == PaymentType.usd) {
      _takeFundUSD(_amount, _paymentCurrency);
    } else if (paymentType == PaymentType.other) {
      _takeFundOther(_amount);
    } else if (_paymentCurrency == PaymentCurrency.fota) {
      _takeFundFOTA(_amount);
    }  else if (_paymentCurrency == PaymentCurrency.other) {
      _takeFundOther(_amount);
    } else {
      _takeFundUSD(_amount, _paymentCurrency);
    }
  }

  function _takeFundUSD(uint _amount, PaymentCurrency _paymentCurrency) private {
    require(_paymentCurrency != PaymentCurrency.fota, "RewardManagerV2: paymentCurrency invalid");
    IBEP20 usdToken = _paymentCurrency == PaymentCurrency.busd ? busdToken : usdtToken;
    require(usdToken.allowance(msg.sender, address(this)) >= _amount, "RewardManagerV2: allowance invalid");
    require(usdToken.balanceOf(msg.sender) >= _amount, "RewardManagerV2: insufficient balance");
    require(usdToken.transferFrom(msg.sender, fundAdmin, _amount), "RewardManagerV2: transfer error");
  }

  function _takeFundFOTA(uint _amount) private {
    require(fotaToken.allowance(msg.sender, address(this)) >= _amount, "RewardManagerV2: allowance invalid");
    require(fotaToken.balanceOf(msg.sender) >= _amount, "RewardManagerV2: insufficient balance");
    require(fotaToken.transferFrom(msg.sender, fundAdmin, _amount), "RewardManagerV2: transfer error");
  }

  function _takeFundOther(uint _amount) private {
    require(otherPayment.allowance(msg.sender, address(this)) >= _amount, "RewardManagerV2: allowance invalid");
    require(otherPayment.balanceOf(msg.sender) >= _amount, "RewardManagerV2: insufficient balance");
    require(otherPayment.transferFrom(msg.sender, fundAdmin, _amount), "RewardManagerV2: transfer error");
  }

  // TODO for testing purpose only

  function setTokenContract(address _fotaToken, address _busdToken, address _usdtToken) external onlyMainAdmin {
    fotaToken = IFOTAToken(_fotaToken);
    busdToken = IFOTAToken(_busdToken);
    usdtToken = IFOTAToken(_usdtToken);
  }
}
