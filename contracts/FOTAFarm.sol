// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "./libs/fota/Auth.sol";
import "./libs/zeppelin/token/BEP20/IBEP20.sol";
import "./interfaces/IFOTAToken.sol";
import "./interfaces/ILPToken.sol";

contract FOTAFarm is Auth {
  struct Farmer {
    uint fotaDeposited;
    uint lpDeposited;
    uint point;
    mapping(uint => uint) dailyCheckinPoint;
    uint totalEarned;
    uint totalMissed;
    uint lastDayScanMissedClaim;
  }
  mapping (address => Farmer) public farmers;
  IFOTAToken public fotaToken;
  ILPToken public lpToken;
  uint public startTime;
  uint public totalFotaDeposited;
  uint public totalLPDeposited;
  uint public totalEarned;
  uint public rewardingDays;
  uint public fundingFOTADays;
  uint public lpBonus;
  uint public secondInADay;
  uint public totalPoint;
  uint constant decimal6 = 1e6;

  mapping(uint => uint) public dailyReward;
  mapping(uint => uint) public dailyCheckinPoint;
  mapping(uint => bool) public missProcessed;
  mapping(address => mapping (uint => bool)) public checkinTracker;

  event FOTADeposited(address indexed farmer, uint amount, uint point);
  event LPDeposited(address indexed farmer, uint amount, uint point);
  event RewardingDaysUpdated(uint rewardingDays);
  event FundingFOTADaysUpdated(uint fundingFOTADays);
  event LPBonusRateUpdated(uint rate);
  event FOTAFunded(uint amount, uint fisrtFundedDay, uint timestamp);
  event Claimed(address indexed farmer, uint day, uint amount, uint timestamp);
  event Missed(address indexed farmer, uint day, uint amount);
  event Withdrew(address indexed farmer, uint fotaDeposited, uint lpDeposited, uint timestamp);
  event CheckedIn(address indexed farmer, uint dayPassed, uint checkinPoint, uint timestamp);

  modifier initStartTime() {
    require(startTime > 0, "Please init startTime");
    _;
  }

  function initialize(address _mainAdmin) override public initializer {
    super.initialize(_mainAdmin);
    fotaToken = IFOTAToken(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
    lpToken = ILPToken(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4); // TODO
    rewardingDays = 3;
    fundingFOTADays = 3;
    lpBonus = 25e5;
    secondInADay = 86400; // 24 * 60 * 60
  }

  function depositFOTA(uint _amount) external initStartTime {
    _takeFundFOTA(_amount);
    Farmer storage farmer = farmers[msg.sender];
    farmer.fotaDeposited += _amount;
    farmer.point += _amount;
    totalPoint += _amount;
    totalFotaDeposited += _amount;
    uint dayPassed = getDaysPassed();
    if (!checkinTracker[msg.sender][dayPassed]) {
      _checkin(dayPassed, farmer);
    }
    emit FOTADeposited(msg.sender, _amount, _amount);
  }

  function depositLP(uint _amount) external initStartTime {
    _takeFundLP(_amount);
    uint point = getPointWhenDepositViaLP(_amount);
    Farmer storage farmer = farmers[msg.sender];
    farmer.lpDeposited += _amount;
    farmer.point += point;
    totalPoint += point;
    totalLPDeposited += _amount;
    uint dayPassed = getDaysPassed();
    if (!checkinTracker[msg.sender][dayPassed]) {
      _checkin(dayPassed, farmer);
    }
    emit LPDeposited(msg.sender, _amount, point);
  }

  function checkin() external {
    Farmer storage farmer = farmers[msg.sender];
    require(farmer.point > 0, "FOTAFarm: please join the farm first");
    uint dayPassed = getDaysPassed();
    bool success = _checkin(dayPassed, farmer);
    require(success, "FOTAFarm: no reward today");
  }

  function claim() external {
    require(farmers[msg.sender].point > 0, "FOTAFarm: please join the farm first");
    uint dayPassed = getDaysPassed();
    _checkClaim(dayPassed, farmers[msg.sender]);
    _checkMissedClaim(dayPassed, farmers[msg.sender]);
  }

  function withdraw() external {
    Farmer storage farmer = farmers[msg.sender];
    require(farmer.point > 0, "404");
    uint dayPassed = getDaysPassed();
    _checkClaim(dayPassed, farmer);
    _checkMissedClaim(dayPassed, farmer);
    _movePendingRewardToFundFOTA(dayPassed, farmer);
    uint fotaDeposited = farmer.fotaDeposited;
    uint lpDeposited = farmer.lpDeposited;
    totalFotaDeposited -= farmer.fotaDeposited;
    totalLPDeposited -= farmer.lpDeposited;
    if (farmer.fotaDeposited > 0) {
      farmer.fotaDeposited = 0;
    }
    if (farmer.lpDeposited > 0) {
      farmer.lpDeposited = 0;
    }
    if (checkinTracker[msg.sender][dayPassed]) {
      dailyCheckinPoint[dayPassed] -= farmer.point;
    }
    totalPoint -= farmer.point;
    farmer.point = 0;
    for (uint i = 0; i <= rewardingDays; i++) {
      uint index = dayPassed - i;
      if (farmers[msg.sender].dailyCheckinPoint[index] > 0) {
        farmers[msg.sender].dailyCheckinPoint[index] = 0;
      }
    }
    if (fotaDeposited > 0) {
      fotaToken.transfer(msg.sender, fotaDeposited);
    }
    if (lpDeposited > 0) {
      lpToken.transfer(msg.sender, lpDeposited);
    }
    emit Withdrew(msg.sender, fotaDeposited, lpDeposited, block.timestamp);
  }

  function fundFOTA(uint _amount) external initStartTime {
    _takeFundFOTA(_amount);
    uint dayPassed = getDaysPassed();
    _fundFOTA(_amount, dayPassed);
  }

  function getDaysPassed() public view returns (uint) {
    if (startTime == 0) {
      return 0;
    }
    uint timePassed = block.timestamp - startTime;
    return timePassed / secondInADay;
  }

  function getTotalRewarded() public view returns (uint) {
    uint totalRewarded = 0;
    uint dayPassed = getDaysPassed();
    for (uint i = 0; i < fundingFOTADays; i++) {
      totalRewarded += dailyReward[dayPassed + i];
    }
    return totalRewarded;
  }

  function getProfitRate() external view returns (uint) {
    if (totalPoint == 0) {
      return 0;
    }
    return getTotalRewarded() * decimal6 / totalPoint;
  }

  function getUserStats(address _user) external view returns (uint, uint) {
    uint pendingReward;
    uint dayPassed = getDaysPassed();
    require(dayPassed >= rewardingDays, "FOTAFarm: please wait more time");
    for (uint i = 1; i <= rewardingDays; i++) {
      uint index = dayPassed - i;
      if (dailyCheckinPoint[index] > 0) {
        uint reward = farmers[_user].dailyCheckinPoint[index] * dailyReward[index] / dailyCheckinPoint[index];
        pendingReward += reward;
      }
    }
    uint todayClaimRewardIndex = dayPassed - rewardingDays;

    if (dailyCheckinPoint[todayClaimRewardIndex] > 0) {
      uint todayClaimReward = farmers[_user].dailyCheckinPoint[todayClaimRewardIndex] * dailyReward[todayClaimRewardIndex] / dailyCheckinPoint[todayClaimRewardIndex];
      return (pendingReward, todayClaimReward);
    }

    return (pendingReward, 0);
  }

  function getUserDailyCheckinPoint(address _user, uint _dayPassed) external view returns (uint) {
    return farmers[_user].dailyCheckinPoint[_dayPassed];
  }

  function getPointWhenDepositViaLP(uint _lpAmount) public view returns (uint) {
    uint fotaBalance = fotaToken.balanceOf(address(lpToken));
    uint lpSupply = lpToken.totalSupply();
    return fotaBalance * lpBonus * _lpAmount / lpSupply / decimal6;
  }

  // PRIVATE FUNCTIONS

  function _checkin(uint _dayPassed, Farmer storage _farmer) private returns (bool) {
    if (dailyReward[_dayPassed] == 0) {
      return false;
    }
    require(!checkinTracker[msg.sender][_dayPassed], "FOTAFarm: checked in");
    checkinTracker[msg.sender][_dayPassed] = true;
    dailyCheckinPoint[_dayPassed] += farmers[msg.sender].point;
    if (_farmer.lastDayScanMissedClaim == 0) {
      _farmer.lastDayScanMissedClaim = _dayPassed - 1;
    }

    farmers[msg.sender].dailyCheckinPoint[_dayPassed] = farmers[msg.sender].point;
    emit CheckedIn(msg.sender, _dayPassed, farmers[msg.sender].point, block.timestamp);
    if (_dayPassed > rewardingDays + 1) {
      _checkMissedClaim(_dayPassed, _farmer);
    }
    return true;
  }

  function _checkMissedClaim(uint _dayPassed, Farmer storage _farmer) private {
    if (_farmer.lastDayScanMissedClaim > 0 && _farmer.lastDayScanMissedClaim < _dayPassed - rewardingDays) {
      uint missedAmount;
      for (uint i = _farmer.lastDayScanMissedClaim + 1; i < _dayPassed - rewardingDays; i++) {
        if (_farmer.dailyCheckinPoint[i] > 0) {
          uint reward = _farmer.dailyCheckinPoint[i] * dailyReward[i] / dailyCheckinPoint[i];
          emit Missed(msg.sender, i, reward);
          missedAmount += reward;
        }
      }
      _farmer.lastDayScanMissedClaim = _dayPassed - rewardingDays - 1;
      if (missedAmount > 0) {
        _farmer.totalMissed += missedAmount;
        _fundFOTA(missedAmount, _dayPassed);
      }
    }
  }

  function _movePendingRewardToFundFOTA(uint _dayPassed, Farmer storage _farmer) private {
    if (_farmer.lastDayScanMissedClaim == 0) return;
    uint missedAmount;
    for (uint i = _farmer.lastDayScanMissedClaim + 1; i < _dayPassed; i++) {
      if (_farmer.dailyCheckinPoint[i] > 0) {
        uint reward = _farmer.dailyCheckinPoint[i] * dailyReward[i] / dailyCheckinPoint[i];
        if (reward > 0) {
          emit Missed(msg.sender, i, reward);
          missedAmount += reward;
        }
        if (_farmer.dailyCheckinPoint[i] > 0) {
          _farmer.dailyCheckinPoint[i] = 0;
        }
      }
    }
    if (missedAmount > 0) {
      _farmer.totalMissed += missedAmount;
      _fundFOTA(missedAmount, _dayPassed);
    }
  }

  function _checkClaim(uint _dayPassed, Farmer storage _farmer) private returns (uint) {
    require(_dayPassed >= rewardingDays, "FOTAFarm: please wait for more time");
    uint index = _dayPassed - rewardingDays;
    if (dailyCheckinPoint[index] == 0 || _farmer.dailyCheckinPoint[index] == 0 || dailyReward[index] == 0) {
      return 0;
    }
    uint reward = _farmer.dailyCheckinPoint[index] * dailyReward[index] / dailyCheckinPoint[index];
    _farmer.dailyCheckinPoint[index] = 0;
    if (reward == 0) {
      return 0;
    }
    if (_farmer.totalEarned == 0) {
      _farmer.totalEarned = reward;
    } else {
      _farmer.totalEarned += reward;
    }
    totalEarned += reward;
    require(fotaToken.balanceOf(address(this)) >= reward, "FOTAFarm: contract is insufficient balance");
    fotaToken.transfer(msg.sender, reward);
    emit Claimed(msg.sender, index, reward, block.timestamp);
    return reward;
  }

  function _fundFOTA(uint _amount, uint _dayPassed) private {
    uint restAmount = _amount;
    uint eachDayAmount = _amount / fundingFOTADays;
    for(uint i = 1; i < fundingFOTADays; i++) {
      dailyReward[_dayPassed + i] += eachDayAmount;
      restAmount -= eachDayAmount;
    }
    dailyReward[_dayPassed + fundingFOTADays] += restAmount;
    emit FOTAFunded(_amount, _dayPassed + 1, block.timestamp);
  }

  function _takeFundFOTA(uint _amount) private {
    require(fotaToken.allowance(msg.sender, address(this)) >= _amount, "FOTAFarm: please approve fota first");
    require(fotaToken.balanceOf(msg.sender) >= _amount, "FOTAFarm: insufficient balance");
    require(fotaToken.transferFrom(msg.sender, address(this), _amount), "FOTAFarm: transfer fota failed");
  }

  function _takeFundLP(uint _amount) private {
    require(lpToken.allowance(msg.sender, address(this)) >= _amount, "FOTAFarm: please approve LP token first");
    require(lpToken.balanceOf(msg.sender) >= _amount, "FOTAFarm: insufficient balance");
    require(lpToken.transferFrom(msg.sender, address(this), _amount), "FOTAFarm: transfer LP token failed");
  }

  function _sqrt(uint x) private pure returns (uint y) {
    uint z = (x + 1) / 2;
    y = x;
    while (z < y) {
      y = z;
      z = (x / z + z) / 2;
    }
  }

  // ADMIN FUNCTIONS
  function start(uint _startTime) external onlyMainAdmin {
    require(startTime == 0, "FOTAFarm: startTime had been initialized");

    uint timePassed = block.timestamp - _startTime;
    uint dayPassed = timePassed / secondInADay;
    require(_startTime >= 0 && dayPassed - 1 >= rewardingDays, "FOTAFarm: must be earlier rewardingDays");
    startTime = _startTime;
  }

  function updateRewardingDays(uint _days) external onlyMainAdmin {
    require(_days > 0, "FOTAFarm: days invalid");
    rewardingDays = _days;
    emit RewardingDaysUpdated(_days);
  }

  function updateFundingFOTADays(uint _days) external onlyMainAdmin {
    require(_days > 0, "FOTAFarm: days invalid");
    fundingFOTADays = _days;
    emit FundingFOTADaysUpdated(_days);
  }

  function updateLPBonusRate(uint _rate) external onlyMainAdmin {
    require(_rate > 0, "FOTAFarm: rate invalid");
    lpBonus = _rate;
    emit LPBonusRateUpdated(_rate);
  }

  function drainToken(address _tokenAddress, uint _amount) external onlyMainAdmin {
    IBEP20 token = IBEP20(_tokenAddress);
    require(_amount <= token.balanceOf(address(this)), "FOTAFarm: Contract is insufficient balance");
    token.transfer(msg.sender, _amount);
  }

  function updateSecondInADay(uint _secondInDay) external onlyMainAdmin {
    secondInADay = _secondInDay;
  }

  function setContracts(address _fota, address _lp) external onlyMainAdmin {
    fotaToken = IFOTAToken(_fota);
    lpToken = ILPToken(_lp);
  }

  function syncTime() external onlyMainAdmin {
    startTime = 1654819200;
  }
}
