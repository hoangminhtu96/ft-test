// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./libs/fota/Auth.sol";
import "./interfaces/IRewardManager.sol";
import "./interfaces/IGameNFT.sol";
import "./libs/zeppelin/token/BEP20/IBEP20.sol";
import "./interfaces/IFOTAPricer.sol";

contract MarketPlaceV2Auth is Auth {
  address public gamePVE;

  function initialize(address _mainAdmin, address _gamePVE) internal {
    super.initialize(_mainAdmin);
    gamePVE = _gamePVE;
  }

  function updatePVE(address _gamePVE) external onlyMainAdmin {
    gamePVE = _gamePVE;
  }

  modifier onlyPVE() {
    require(msg.sender == gamePVE || _isMainAdmin(), "Only PVE");
    _;
  }
}

contract MarketPlaceV2 is MarketPlaceV2Auth, EIP712Upgradeable, PausableUpgradeable {
  enum OrderStatus {
    created,
    canceled,
    taken,
    completed,
    ownerRevoked,
    finished
  }
  struct Order {
    address maker;
    address taker;
    uint[] tokenIds;
    uint takerShare; // decimal 3
    uint startAt;
    uint duration;
    uint orderTrustFee;
    PaymentCurrency paymentCurrency;
    OrderStatus status;
  }
  enum PaymentType {
    fota,
    usd,
    all
  }
  enum PaymentCurrency {
    fota,
    busd,
    usdt
  }
  IRewardManager public rewardManager;
  IGameNFT public heroNft;
  mapping (uint => Order) public orders;
  mapping (address => bool) public lockedUser;
  uint public signatureTimeOut;
  mapping (address => uint) public nonces;
  mapping (uint => address) public authorizations;
  uint constant heroPrice = 50e6;
  uint constant oneHundredPercentageDecimal3 = 100000;
  uint private orderCounter;
  uint public orderTrustFee;
  IBEP20 public fotaToken;
  mapping (uint => bool) public heroInOrder;
  uint public summonTime;
  mapping (uint => uint) public expiredSummons;
  PaymentType public paymentType;
  IFOTAPricer public fotaPricer;
  IBEP20 public busdToken;
  IBEP20 public usdtToken;
  bool public allowMaxProfitTrading;
  uint8 public shardHeroLevel;
  uint public shardHeroOwnPrice;
  uint public gemHeroOwnPrice;
  uint public minShareRate;
  uint public maxShareRate;

  event HeroSummoned(address indexed owner, address usingRight, uint tokenId, uint timestamp, uint summonExpired, uint gemAmount, uint eatherNumber);
  event HeroesRevoked(uint[] tokenIds, uint timestamp);
  event OrderCreated(uint indexed id, address maker, uint[] tokenIds, uint takerShare, uint rentingTime, uint orderTrustFee, uint timestamp);
  event OrderCanceled(uint indexed id);
  event OrderTaken(uint indexed id, address indexed taker, uint[] tokenIds, uint amount, PaymentType paymentType, PaymentCurrency paymentCurrency);
  event OrderRevoked(uint[] ids, uint timestamp);
  event OrderRevokedByOwner(uint id, uint timestamp, bool orderValid);
  event PaymentTypeChanged(PaymentType newMethod);
  event PrestigeHeroSummoned(address indexed owner, uint tokenId, uint timestamp, uint summonExpired, uint gemAmount, uint prestigeShardNumber, uint eatherNumber);
  event SignatureTimeOutUpdated(uint timeOut);
  event UserLocked(address user, bool locked);
  event OrderTrustFeeUpdated(uint orderTrustFee, uint timestamp);
  event SummonTimeUpdated(uint second);
  event SummonConfigUpdated(uint8 shardHeroLevel, uint shardHeroOwnPrice, uint gemHeroOwnPrice, uint timestamp);
  event TakerShareRateUpdated(uint minShareRate, uint maxShareRate);

  function initialize(string memory _name, string memory _version, address _mainAdmin, address _rewardManager, address _heroNft, address _gamePVE) public initializer {
    super.initialize(_mainAdmin, _gamePVE);
    EIP712Upgradeable.__EIP712_init(_name, _version);
    rewardManager = IRewardManager(_rewardManager);
    heroNft = IGameNFT(_heroNft);
    fotaToken = IBEP20(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
    signatureTimeOut = 300;
    summonTime = 86400;
  }

  function makeOrder(uint[] calldata _tokenIds, uint _takerShare, uint _duration) external whenNotPaused {
    require(minShareRate <= _takerShare && _takerShare <= maxShareRate, "MarketPlaceV2: taker share invalid");
    _validateUser();
    _validateHeroRight(_tokenIds);
    Order memory order = Order(
      msg.sender,
      address(0),
      _tokenIds,
      _takerShare,
      0,
      _duration,
      orderTrustFee * _tokenIds.length,
      PaymentCurrency.fota,
      OrderStatus.created
    );
    orders[++orderCounter] = order;
    heroNft.updateLockedFromMKPStatus(order.tokenIds, true);
    emit OrderCreated(orderCounter, msg.sender, _tokenIds, _takerShare, _duration, orderTrustFee * _tokenIds.length, block.timestamp);
  }

  function cancelOrder(uint _orderId) external whenNotPaused {
    Order storage order = orders[_orderId];
    require(order.maker == msg.sender && order.taker == address(0), "EatherTrading: order invalid");
    heroNft.updateLockedFromMKPStatus(order.tokenIds, false);
    for(uint i = 0; i < order.tokenIds.length; i++) {
      delete heroInOrder[order.tokenIds[i]];
    }
    orders[_orderId].status = OrderStatus.canceled;
    emit OrderCanceled(_orderId);
  }

  function takeOrder(uint _orderId, PaymentCurrency _paymentCurrency) external whenNotPaused {
    _validateUser();
    Order storage order = orders[_orderId];
    _takeFund(order, _paymentCurrency);
    require(order.maker != msg.sender, "MarketplaceV2: self trading");
    require(order.maker != address(0) && order.taker == address(0) && order.status == OrderStatus.created, "MarketplaceV2: order invalid");
    order.taker = msg.sender;
    order.startAt = block.timestamp;
    order.paymentCurrency = _paymentCurrency;
    order.status = OrderStatus.taken;
    for (uint i = 0; i < order.tokenIds.length; i++) {
      authorizations[order.tokenIds[i]] = msg.sender;
    }
    emit OrderTaken(_orderId, msg.sender, order.tokenIds, order.orderTrustFee, paymentType, _paymentCurrency);
  }

  function summonShardHero(uint16 _classId, bytes memory _signature, uint _timestamp) external whenNotPaused {
    _validateSignature(_classId, _timestamp, _signature, 0);
    uint tokenId = heroNft.mintHero(address(this), _classId, shardHeroOwnPrice, 0);
    _updateHeroInfo(tokenId);
    authorizations[tokenId] = msg.sender;
    uint expiredTime = _setTimeExpiredForSummonHero(tokenId);
    emit HeroSummoned(address(this), msg.sender, tokenId, block.timestamp, expiredTime, 0, 0);
  }

  function summonHero(uint16 _classId, uint _gemFee, bytes memory _signature, uint _timestamp) external whenNotPaused {
    rewardManager.summonHero(msg.sender, _gemFee);
    _validateSignature(_classId, _timestamp, _signature, _gemFee);
    uint tokenId = heroNft.mintHero(msg.sender, _classId, gemHeroOwnPrice, 0);
    emit HeroSummoned(msg.sender, msg.sender, tokenId, block.timestamp, 0, _gemFee, 1);
  }

  function summonPrestigeHero(uint16 _classId, uint _gemFee, bytes memory _signature, uint _timestamp) external whenNotPaused {
    rewardManager.summonPrestigeHero(msg.sender, _gemFee);
    _validateSignature(_classId, _timestamp, _signature, _gemFee);
    uint tokenId = heroNft.mintHero(msg.sender, _classId, gemHeroOwnPrice, 0);
    emit PrestigeHeroSummoned(msg.sender, tokenId, block.timestamp, 0, _gemFee, 1, 1);
  }

  function ownerRevokeOrder(uint _orderId, bytes memory _signature, uint _timestamp, bool _orderValid) external {
    Order storage order = orders[_orderId];
    require(order.maker == msg.sender, "MarketplaceV2: not your order");
    _validateRevokeHeroesSignature(_orderId, _timestamp, _signature, _orderValid);
    for (uint i = 0; i < order.tokenIds.length; i++) {
      delete authorizations[order.tokenIds[i]];
      delete heroInOrder[order.tokenIds[i]];
    }
    _refund(_orderValid ? order.taker : order.maker, order.paymentCurrency, order.orderTrustFee);
    heroNft.updateLockedFromMKPStatus(order.tokenIds, false);
    orders[_orderId].status = OrderStatus.ownerRevoked;
    emit OrderRevokedByOwner(_orderId, block.timestamp, _orderValid);
  }

  // ADMIN FUNCTIONS

  function updateTakerShareRate(uint _minShareRate, uint _maxShareRate) external onlyMainAdmin {
    require(_minShareRate <= _maxShareRate && _maxShareRate <= oneHundredPercentageDecimal3, "MarketplaceV2: rate invalid");
    minShareRate = _minShareRate;
    maxShareRate = _maxShareRate;
    emit TakerShareRateUpdated(_minShareRate, _minShareRate);
  }

  function revokeOrders(uint[] calldata _orderIds, uint[] calldata _receivers) external onlyPVE {
    Order storage order;
    for (uint i = 0; i < _orderIds.length; i++) {
      order = orders[_orderIds[i]];
      require(order.taker != address(0), "MarketPlaceV2: order invalid");
      for (uint j = 0; j < order.tokenIds.length; j++) {
        delete authorizations[order.tokenIds[j]];
        delete heroInOrder[order.tokenIds[j]];
      }
      _refund(_receivers[i] == 0 ? order.maker : order.taker, order.paymentCurrency, order.orderTrustFee);
      heroNft.updateLockedFromMKPStatus(order.tokenIds, false);
      orders[_orderIds[i]].status = OrderStatus.completed;
    }
    emit OrderRevoked(_orderIds, block.timestamp);
  }

  function revokeHeroes(uint[] calldata _heroIds) external onlyPVE {
    for (uint i = 0; i < _heroIds.length; i++) {
      require(block.timestamp >= expiredSummons[_heroIds[i]], "MarketPlaceV2: hero not expired");
      heroNft.burn(_heroIds[i]);
      delete authorizations[_heroIds[i]];
      delete heroInOrder[_heroIds[i]];
    }
    emit HeroesRevoked(_heroIds, block.timestamp);
  }

  function updateLockUserStatus(address _user, bool _locked) external onlyMainAdmin {
    lockedUser[_user] = _locked;
    emit UserLocked(_user, _locked);
  }

  function updatePauseStatus(bool _paused) external onlyMainAdmin {
    if(_paused) {
      _pause();
    } else {
      _unpause();
    }
  }

  function updateSignatureTimeout(uint _timeOut) external onlyMainAdmin {
    signatureTimeOut = _timeOut;
    emit SignatureTimeOutUpdated(_timeOut);
  }

  function updateOrderTrustFee(uint _orderTrustFee) external onlyMainAdmin {
    orderTrustFee = _orderTrustFee;
    emit OrderTrustFeeUpdated(_orderTrustFee, block.timestamp);
  }

  function updatePaymentType(PaymentType _type) external onlyMainAdmin {
    paymentType = _type;
    emit PaymentTypeChanged(_type);
  }

  function setContracts(address _rewardManager, address _heroNft, address _gamePVE, address _fotaToken, address _busdToken, address _usdtToken, address _fotaPricer) external onlyMainAdmin {
    rewardManager = IRewardManager(_rewardManager);
    heroNft = IGameNFT(_heroNft);
    gamePVE = _gamePVE;
    fotaToken = IBEP20(_fotaToken);
    busdToken = IBEP20(_busdToken);
    usdtToken = IBEP20(_usdtToken);
    fotaPricer = IFOTAPricer(_fotaPricer);
  }

  function updateSummonTime(uint _summonTime) external onlyMainAdmin {
    summonTime = _summonTime;

    emit SummonTimeUpdated(_summonTime);
  }

  // PRIVATE FUNCTIONS

  function _updateHeroInfo(uint _tokenId) private {
    (,,,,,, uint32 experience) = heroNft.getHero(_tokenId);
    (uint skill1, uint skill2, uint skill3) = heroNft.getHeroSkills(_tokenId);
    heroNft.updateHeroInfo(_tokenId, shardHeroLevel, experience, [skill1, skill2, skill3]);
  }

  function _validateUser() private view {
    require(!lockedUser[msg.sender], "MarketPlaceV2: user locked");
  }

  function _takeFund(Order storage _order, PaymentCurrency _paymentCurrency) private {
    if (paymentType == PaymentType.fota) {
      _order.orderTrustFee = _order.orderTrustFee * 1000 / fotaPricer.fotaPrice();
      _takeFundFOTA(_order.orderTrustFee);
    } else if (paymentType == PaymentType.usd) {
      _takeFundUSD(_order.orderTrustFee, _paymentCurrency);
    } else if (_paymentCurrency == PaymentCurrency.fota) {
      _order.orderTrustFee = _order.orderTrustFee * 1000 / fotaPricer.fotaPrice();
      _takeFundFOTA(_order.orderTrustFee);
    } else {
      _takeFundUSD(_order.orderTrustFee, _paymentCurrency);
    }
  }

  function _refund(address _taker, PaymentCurrency _paymentCurrency, uint _amount) private {
    if (_paymentCurrency == PaymentCurrency.fota) {
      require(fotaToken.balanceOf(address(this)) >= _amount, "MarketPlaceV2: contract insufficient balance");
      fotaToken.transfer(_taker, _amount);
    } else if (_paymentCurrency == PaymentCurrency.busd) {
      require(busdToken.balanceOf(address(this)) >= _amount, "MarketPlaceV2: contract insufficient balance");
      busdToken.transfer(_taker, _amount);
    } else {
      require(usdtToken.balanceOf(address(this)) >= _amount, "MarketPlaceV2: contract insufficient balance");
      usdtToken.transfer(_taker, _amount);
    }
  }

  function _takeFundUSD(uint _amount, PaymentCurrency _paymentCurrency) private {
    require(_paymentCurrency != PaymentCurrency.fota, "MarketPlaceV2: paymentCurrency invalid");
    IBEP20 usdToken = _paymentCurrency == PaymentCurrency.busd ? busdToken : usdtToken;
    require(usdToken.allowance(msg.sender, address(this)) >= _amount, "MarketPlaceV2: insufficient balance");
    require(usdToken.balanceOf(msg.sender) >= _amount, "MarketPlaceV2: allowance invalid");
    require(usdToken.transferFrom(msg.sender, address(this), _amount), "MarketPlaceV2: transfer error");
  }

  function _takeFundFOTA(uint _amount) private {
    require(fotaToken.allowance(msg.sender, address(this)) >= _amount, "MarketPlaceV2: please approve fota first");
    require(fotaToken.balanceOf(msg.sender) >= _amount, "MarketPlaceV2: insufficient balance");
    require(fotaToken.transferFrom(msg.sender, address(this), _amount), "MarketPlaceV2: transfer fota failed");
  }

  function _validateHeroRight(uint[] calldata _tokenIds) private {
    require(_tokenIds.length == 3 || _tokenIds.length == 6 || _tokenIds.length == 9, "MarketPlaceV2: quantity invalid");
    for (uint i = 0; i < _tokenIds.length; i++) {
      require(!heroInOrder[_tokenIds[i]], "MarketPlaceV2: hero is in order");
      heroInOrder[_tokenIds[i]] = true;
      require(!heroNft.lockedFromMKP(_tokenIds[i]), "MarketPlaceV2: hero locked");
      if(!allowMaxProfitTrading) {
        require(!heroNft.reachMaxProfit(_tokenIds[i]), "MarketPlaceV2: hero reached max profit");
      }
      address owner = heroNft.ownerOf(_tokenIds[i]);
      require(owner == msg.sender, "MarketPlaceV2: hero invalid");
      if (i > 0) {
        require(_tokenIds[i] > _tokenIds[i - 1], "MarketPlaceV2: hero order invalid");
      }
    }
  }

  function _validateSignature(uint16 _classId, uint _timestamp, bytes memory _signature, uint _gemFee) private {
    require(_timestamp + signatureTimeOut >= block.timestamp, "MarketPlaceV2: signature time out");
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        keccak256("SummonHero(address user,uint256 nonce,uint16 classId,uint256 timestamp,uint256 gemFee)"),
        msg.sender,
        nonces[msg.sender],
        _classId,
        _timestamp,
        _gemFee
      )));
    nonces[msg.sender]++;
    address signer = ECDSAUpgradeable.recover(digest, _signature);
    require(signer == contractAdmin, "MessageVerifier: invalid signature");
    require(signer != address(0), "ECDSAUpgradeable: invalid signature");
  }

  function _validateRevokeHeroesSignature(uint _orderId, uint _timestamp, bytes memory _signature, bool _orderValid) private {
    require(_timestamp + signatureTimeOut >= block.timestamp, "MarketPlaceV2: signature time out");
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        keccak256("RevokeHeroes(address user,uint256 nonce,uint256 orderId,uint256 timestamp,bool orderValid)"),
        msg.sender,
        nonces[msg.sender],
        _orderId,
        _timestamp,
        _orderValid
      )));
    nonces[msg.sender]++;
    address signer = ECDSAUpgradeable.recover(digest, _signature);
    require(signer == contractAdmin, "MessageVerifier: invalid signature");
    require(signer != address(0), "ECDSAUpgradeable: invalid signature");
  }

  function _setTimeExpiredForSummonHero(uint _tokenId) private returns (uint) {
    expiredSummons[_tokenId] = block.timestamp + summonTime;

    return block.timestamp + summonTime;
  }

  function updateAllowMaxProfitTrading(bool _allowed) external onlyMainAdmin {
    allowMaxProfitTrading = _allowed;
  }

  function updateSummonConfig(uint8 _shardHeroLevel, uint _shardHeroOwnPrice, uint _gemHeroOwnPrice) external onlyMainAdmin {
    shardHeroLevel = _shardHeroLevel;
    shardHeroOwnPrice = _shardHeroOwnPrice;
    gemHeroOwnPrice = _gemHeroOwnPrice;
    emit SummonConfigUpdated(shardHeroLevel, shardHeroOwnPrice, gemHeroOwnPrice, block.timestamp);
  }
}
