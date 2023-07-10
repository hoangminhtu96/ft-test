// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./libs/zeppelin/token/BEP20/IBEP20.sol";
import "./interfaces/IGameNFT.sol";
import "./interfaces/ICitizen.sol";
import "./interfaces/IMarketPlace.sol";
import "./interfaces/IFOTAGame.sol";
import "./interfaces/IFOTAPricer.sol";
import "./interfaces/IEatherTransporter.sol";
import "./libs/fota/Auth.sol";
import "./interfaces/IEnergyManager.sol";
import "./interfaces/IRewardManager.sol";

contract MarketPlace is Auth, PausableUpgradeable {
  struct Order {
    address maker;
    uint startingPrice;
    uint endingPrice;
    uint auctionDuration;
    uint rentingDuration;
    uint activatedAt;
    bool rented;
  }
  IBEP20 public fotaToken;
  IBEP20 public busdToken;
  IBEP20 public usdtToken;
  mapping (IMarketPlace.OrderKind => mapping (uint => Order)) public tradingOrders;
  mapping (IMarketPlace.OrderKind => mapping (uint => Order)) public rentingOrders;
  mapping (IMarketPlace.OrderKind => IGameNFT) public nftTokens;
  mapping (address => bool) public lockedUser;
  mapping (uint16 => bool) public lockedHeroClassId;
  mapping (uint16 => bool) public lockedItemClassId;
  mapping (uint => bool) public lockedHeroNFTId;
  mapping (uint => bool) public lockedItemNFTId;
  mapping (IMarketPlace.OrderKind => mapping(uint16 => uint)) public remainingSale;
  address public fundAdmin;
  address public treasuryAddress;
  ICitizen public citizen;
  IMarketPlace.PaymentType public paymentType;
  IFOTAGame public gameProxyContract;
  IFOTAPricer public fotaPricer;
  IEatherTransporter public eatherTransporter;
  uint public referralShare; // decimal 3
  uint public creativeShare; // decimal 3
  uint public treasuryShare; // decimal 3
  mapping(uint16 => uint) public heroPrices;
  mapping(uint16 => uint) public heroMinPrices;
  mapping(uint16 => uint) public itemPrices;
  mapping(uint16 => uint) public itemMinPrices;
  uint public minLevel;
  uint public minGene;
  mapping (address => uint) public currentRentedHeroCounter;
  mapping (uint => address) public currentRentingHero;
  uint public minRentingDuration;
  IEnergyManager public energyManager;
  mapping (uint => address) public currentRentingItem;
  uint public secondInADay;
  bool public allowMaxProfitTrading;
  uint public fotaDiscount; // decimal 3
  uint public usdDiscount; // decimal 3
  IRewardManager public rewardManager;

  event RemainingSaleUpdated(
    IMarketPlace.OrderKind kind,
    uint16 classId,
    uint remainingSale
  );
  event OrderCreated(
    IMarketPlace.OrderType indexed orderType,
    IMarketPlace.OrderKind indexed orderKind,
    uint indexed tokenId,
    address maker,
    uint startingPrice,
    uint endingPrice,
    uint auctionDuration,
    uint rentingDuration
  );
  event OrderCanceled(
    IMarketPlace.OrderType indexed orderType,
    IMarketPlace.OrderKind indexed orderKind,
    uint indexed tokenId
  );
  event OrderCanceledByAdmin(
    IMarketPlace.OrderKind indexed orderKind,
    uint indexed tokenId
  );
  event OrderTaken(
    IMarketPlace.OrderKind orderKind,
    IMarketPlace.OrderType indexed orderType,
    uint indexed tokenId,
    address indexed taker,
    IMarketPlace.PaymentType paymentType,
    uint amount,
    IMarketPlace.PaymentCurrency paymentCurrency
  );
  event FoundingOrderTaken(
    IMarketPlace.OrderKind kind,
    uint indexed tokenId,
    address indexed taker,
    IMarketPlace.PaymentType paymentType,
    uint amount,
    IMarketPlace.PaymentCurrency paymentCurrency
  );
  event OrderCompleted(
    IMarketPlace.OrderKind indexed orderKind,
    uint indexed tokenId
  );
  event MinLevelChanged(
    uint8 minLevel
  );
  event MinGeneChanged(
    uint8 minGene
  );
  event PaymentTypeChanged(
    IMarketPlace.PaymentType newMethod
  );
  event UserLocked(
    address user,
    bool locked
  );
  event HeroClassIdLocked(
    uint16 classId,
    bool locked
  );
  event DiscountUpdated(
    uint fotaDiscount,
    uint usdDiscount
  );
  event ItemClassIdLocked(
    uint16 classId,
    bool locked
  );
  event ItemNFTLocked(
    uint id,
    bool locked
  );
  event HeroPriceUpdated(uint16 class, uint price);
  event HeroMinPriceUpdated(uint16 class, uint price);
  event ItemPriceUpdated(uint16 class, uint price);
  event ItemMinPriceUpdated(uint16 class, uint price);
  event ReferralSent(
    address indexed inviter,
    address indexed invitee,
    uint referralSharingAmount,
    IMarketPlace.PaymentCurrency paymentCurrency
  );

  function initialize(
    address _mainAdmin
  ) public override initializer {
    Auth.initialize(_mainAdmin);
    fundAdmin = _mainAdmin;
  }

  function makeOrder(
    IMarketPlace.OrderType _type,
    IMarketPlace.OrderKind _kind,
    uint _tokenId,
    uint _startPrice,
    uint _endingPrice,
    uint _auctionDuration,
    uint _rentingDuration
  ) public whenNotPaused {
    _validateUser();
    if (_kind == IMarketPlace.OrderKind.hero) {
      _validateHero(_type, _kind, _tokenId, _startPrice, _endingPrice);
    } else if (_kind == IMarketPlace.OrderKind.item) {
      _validateItem(_type, _kind, _tokenId, _startPrice, _endingPrice);
    }
    if (_startPrice != _endingPrice) {
      require(_auctionDuration >= 1 days && _auctionDuration <= 365 days, "auctionDuration 401");
    }
    if (_type == IMarketPlace.OrderType.renting) {
      require(_rentingDuration >= minRentingDuration && _rentingDuration <= 365 days && _rentingDuration % secondInADay == 0, "rentingDuration 401");
    }
    require(nftTokens[_kind].ownerOf(_tokenId) == msg.sender, "not owner");
    _transferNFTToken(_kind, msg.sender, address(this), _tokenId);
    Order memory order = Order(
      msg.sender,
      _startPrice,
      _endingPrice,
      _auctionDuration,
      _rentingDuration,
      block.timestamp,
      false
    );
    _type == IMarketPlace.OrderType.trading ? tradingOrders[_kind][_tokenId] = order : rentingOrders[_kind][_tokenId] = order;
    emit OrderCreated(_type, _kind, _tokenId, msg.sender, _startPrice, _endingPrice, _auctionDuration, _rentingDuration);
  }

  function cancelOrder(IMarketPlace.OrderKind _kind, uint _tokenId) external whenNotPaused {
    Order storage tradingOrder = tradingOrders[_kind][_tokenId];
    if (_isActive(tradingOrder)) {
      _cancelTradingOrder(_kind, _tokenId, tradingOrder);
    } else {
      _checkCancelRentingOrder(_kind, _tokenId);
    }
  }

  function takeOrder(IMarketPlace.OrderKind _kind, uint _tokenId, IMarketPlace.PaymentCurrency _paymentCurrency) external whenNotPaused {
    _validateTaker(_paymentCurrency);
    uint16 _classId = nftTokens[_kind].getClassId(_tokenId);
    if (_kind == IMarketPlace.OrderKind.hero) {
      require(!nftTokens[_kind].lockedFromMKP(_tokenId), "hero 401");
      require(!lockedHeroClassId[_classId], "heroClassId 401");
    } else if (_kind == IMarketPlace.OrderKind.item) {
      require(!lockedItemNFTId[_tokenId], "item 401");
      require(!lockedItemClassId[_classId], "itemClassId 401");
    }
    Order storage order = tradingOrders[_kind][_tokenId];
    IMarketPlace.OrderType orderType = IMarketPlace.OrderType.trading;
    if (!_isActive(order)) {
      order = rentingOrders[_kind][_tokenId];
      orderType = IMarketPlace.OrderType.renting;
    }
    require(_isActive(order), "not active");
    require(order.maker != msg.sender, "self buying");
    uint currentPrice = _getCurrentPrice(_kind, _paymentCurrency, order, _tokenId);
    _takeFund(currentPrice, _paymentCurrency);
    address maker = order.maker;
    if (orderType == IMarketPlace.OrderType.trading) {
      _removeTradingOrder(_kind, _tokenId);
    } else {
      _markRentingOrderAsRented(_kind, _tokenId);
    }
    if (currentPrice > 0) {
      _releaseFund(_kind, maker, currentPrice, _tokenId, _paymentCurrency);
    }
    if (orderType == IMarketPlace.OrderType.trading) {
      if (_kind == IMarketPlace.OrderKind.item) {
        nftTokens[_kind].updateFailedUpgradingAmount(_tokenId, 0);
      }
      _transferNFTToken(_kind, address(this), msg.sender, _tokenId);
    }
    emit OrderTaken(_kind, orderType, _tokenId, msg.sender, paymentType, currentPrice, _paymentCurrency);
  }

  function takeFounding(IMarketPlace.OrderKind _kind, uint16 _classId, IMarketPlace.PaymentCurrency _paymentCurrency) external whenNotPaused {
    require(remainingSale[_kind][_classId] > 0, "out of stock");
    remainingSale[_kind][_classId]--;
    _validateTaker(_paymentCurrency);
    uint currentPrice;
    uint tokenId;
    if (_kind == IMarketPlace.OrderKind.hero) {
      currentPrice = heroPrices[_classId];
      tokenId = nftTokens[_kind].mintHero(msg.sender, _classId, currentPrice, 0);
    } else {
      currentPrice = itemPrices[_classId];
      tokenId = nftTokens[_kind].mintItem(msg.sender, 1, _classId, currentPrice, 0);
    }
    if (_isFotaPayment(_paymentCurrency)) {
      currentPrice = currentPrice * 1000 / fotaPricer.fotaPrice();
      if (fotaDiscount > 0) {
        currentPrice = currentPrice * (100000 - fotaDiscount) / 100000;
      }
    } else if (usdDiscount > 0) {
      currentPrice = currentPrice * (100000 - usdDiscount) / 100000;
    }
    require(currentPrice > 0, "price invalid");
    _takeFund(currentPrice / rewardManager.gemRate(), _paymentCurrency);
    _releaseFund(_kind, fundAdmin, currentPrice / rewardManager.gemRate(), tokenId, _paymentCurrency);
    emit FoundingOrderTaken(_kind, tokenId, msg.sender, paymentType, currentPrice, _paymentCurrency);
  }

  function getNFTBack(IMarketPlace.OrderKind _kind, uint _tokenId) external whenNotPaused {
    Order storage order = rentingOrders[_kind][_tokenId];
    require(order.maker == msg.sender, "not owner");
    require(order.rented, "order not completed");
    require(block.timestamp >= order.activatedAt + order.rentingDuration, "wait more time");
    _removeRentingOrder(_kind, _tokenId);
    if (_kind == IMarketPlace.OrderKind.hero) {
      if (currentRentingHero[_tokenId] != address(0)) {
//        energyManager.updatePoint(currentRentingHero[_tokenId], -1);
        if (currentRentedHeroCounter[currentRentingHero[_tokenId]] > 0) {
          currentRentedHeroCounter[currentRentingHero[_tokenId]] -= 1;
        }
        delete currentRentingHero[_tokenId];
      }
    } else if (_kind == IMarketPlace.OrderKind.item) {
      delete currentRentingItem[_tokenId];
    }
    _transferNFTToken(_kind, address(this), msg.sender, _tokenId);
    emit OrderCompleted(_kind, _tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
    return interfaceId == type(IERC721Upgradeable).interfaceId;
  }

  // PRIVATE FUNCTIONS

  function _convertFotaToUsd(uint _amount) private view returns (uint) {
    return _amount * fotaPricer.fotaPrice() / 1000;
  }

  function _validateTaker(IMarketPlace.PaymentCurrency _paymentCurrency) private view {
    _validatePaymentMethod(_paymentCurrency);
    _validateUser();
    require(citizen.isCitizen(msg.sender), "taker 401");
  }

  function _releaseFund(IMarketPlace.OrderKind _kind, address _maker, uint _currentPrice, uint _tokenId, IMarketPlace.PaymentCurrency _paymentCurrency) private {
    uint sharingAmount = _currentPrice * (referralShare + creativeShare + treasuryShare) / 100000;
    _transferFund(_maker, _currentPrice - sharingAmount, _paymentCurrency);
    _shareOrderValue(_kind, _tokenId, sharingAmount, _paymentCurrency);
  }

  function _isFotaPayment(IMarketPlace.PaymentCurrency _paymentCurrency) private view returns (bool) {
    return paymentType == IMarketPlace.PaymentType.fota || (paymentType == IMarketPlace.PaymentType.all && _paymentCurrency == IMarketPlace.PaymentCurrency.fota);
  }

  function _cancelTradingOrder(IMarketPlace.OrderKind _kind, uint _tokenId, Order storage _tradingOrder) private {
    require(_tradingOrder.maker == msg.sender, "not owner of order");
    _removeTradingOrder(_kind, _tokenId);
    _transferNFTToken(_kind, address(this), msg.sender, _tokenId);
    emit OrderCanceled(IMarketPlace.OrderType.trading, _kind, _tokenId);
  }

  function _checkCancelRentingOrder(IMarketPlace.OrderKind _kind, uint _tokenId) private {
    Order storage rentingOrder = rentingOrders[_kind][_tokenId];
    require(_isActive(rentingOrder), "rentingOrder not active");
    require(rentingOrder.maker == msg.sender, "not owner of order");
    _removeRentingOrder(_kind, _tokenId);
    _transferNFTToken(_kind, address(this), msg.sender, _tokenId);
    emit OrderCanceled(IMarketPlace.OrderType.renting, _kind, _tokenId);
  }

  function _isActive(Order storage _order) private view returns (bool) {
    return _order.activatedAt > 0 && !_order.rented;
  }

  function _removeTradingOrder(IMarketPlace.OrderKind _kind, uint _tokenId) private {
    delete tradingOrders[_kind][_tokenId];
  }

  function _markRentingOrderAsRented(IMarketPlace.OrderKind _kind, uint _tokenId) private {
    rentingOrders[_kind][_tokenId].rented = true;
    rentingOrders[_kind][_tokenId].activatedAt = block.timestamp;
    if (_kind == IMarketPlace.OrderKind.hero) {
      currentRentedHeroCounter[msg.sender] += 1;
      currentRentingHero[_tokenId] = msg.sender;
      bool reachMaxProfit = nftTokens[IMarketPlace.OrderKind.hero].reachMaxProfit(_tokenId);
      if (!reachMaxProfit) {
//        energyManager.updatePoint(msg.sender, 1);
      }
    } else if (_kind == IMarketPlace.OrderKind.item) {
      currentRentingItem[_tokenId] = msg.sender;
    }
	}
  function _removeRentingOrder(IMarketPlace.OrderKind _kind, uint _tokenId) private {
    delete rentingOrders[_kind][_tokenId];
  }

  function _getCurrentPrice(IMarketPlace.OrderKind _kind, IMarketPlace.PaymentCurrency _paymentCurrency, Order storage _order, uint _tokenId) private view returns (uint) {
    uint currentPrice;

    if (_order.maker == address(this)) {
      currentPrice = _getPriceFromTokenId(_kind, _tokenId);
    } else {
      uint secondPassed;
      if (block.timestamp > _order.activatedAt) {
        secondPassed = block.timestamp - _order.activatedAt;
      }
      if (secondPassed >= _order.auctionDuration) {
        currentPrice = _order.endingPrice;
      } else {
        int changedPrice = int(_order.endingPrice) - int(_order.startingPrice);
        int currentPriceChange = changedPrice * int(secondPassed) / int(_order.auctionDuration);
        int currentPriceInt = int(_order.startingPrice) + currentPriceChange;
        currentPrice = uint(currentPriceInt);
      }
    }

    return _paymentCurrency == IMarketPlace.PaymentCurrency.fota ? currentPrice * 1000 / fotaPricer.fotaPrice() : currentPrice;
  }

  function _getPriceFromTokenId(IMarketPlace.OrderKind _kind, uint _tokenId) private view returns (uint) {
    require(_kind == IMarketPlace.OrderKind.hero || _kind == IMarketPlace.OrderKind.item, "kind invalid");
    if (_kind == IMarketPlace.OrderKind.hero) {
      (,,, uint16 class,,,) = nftTokens[_kind].getHero(_tokenId);
      return heroPrices[class];
    } else {
      (, uint16 class,,,) = nftTokens[_kind].getItem(_tokenId);
      return itemPrices[class];
    }
  }

  function _takeFund(uint _amount, IMarketPlace.PaymentCurrency _paymentCurrency) private {
    if (paymentType == IMarketPlace.PaymentType.fota) {
      _takeFundFOTA(_amount);
    } else if (paymentType == IMarketPlace.PaymentType.usd) {
      _takeFundUSD(_amount, _paymentCurrency);
    } else if (_paymentCurrency == IMarketPlace.PaymentCurrency.fota) {
      _takeFundFOTA(_amount);
    } else {
      _takeFundUSD(_amount, _paymentCurrency);
    }
  }

  function _takeFundUSD(uint _amount, IMarketPlace.PaymentCurrency _paymentCurrency) private {
    require(_paymentCurrency != IMarketPlace.PaymentCurrency.fota, "paymentCurrency invalid");
    IBEP20 usdToken = _paymentCurrency == IMarketPlace.PaymentCurrency.busd ? busdToken : usdtToken;
    require(usdToken.allowance(msg.sender, address(this)) >= _amount, "MarketPlace: insufficient balance");
    require(usdToken.balanceOf(msg.sender) >= _amount, "allowance invalid");
    require(usdToken.transferFrom(msg.sender, address(this), _amount), "transfer error");
  }

  function _takeFundFOTA(uint _amount) private {
    require(fotaToken.allowance(msg.sender, address(this)) >= _amount, "allowance invalid");
    require(fotaToken.balanceOf(msg.sender) >= _amount, "MarketPlace: insufficient balance");
    require(fotaToken.transferFrom(msg.sender, address(this), _amount), "transfer error");
  }

  function _transferFund(address _receiver, uint _amount, IMarketPlace.PaymentCurrency _paymentCurrency) private {
    if (_receiver == address(this)) {
      _receiver = fundAdmin;
    }
    if (paymentType == IMarketPlace.PaymentType.usd) {
      _transferFundUSD(_receiver, _amount, _paymentCurrency);
    } else if (paymentType == IMarketPlace.PaymentType.fota) {
      _transferFundFOTA(_receiver, _amount);
    } else if (_paymentCurrency == IMarketPlace.PaymentCurrency.fota) {
      _transferFundFOTA(_receiver, _amount);
    } else {
      _transferFundUSD(_receiver, _amount, _paymentCurrency);
    }
  }

  function _transferFundUSD(address _receiver, uint _amount, IMarketPlace.PaymentCurrency _paymentCurrency) private {
    if (_paymentCurrency == IMarketPlace.PaymentCurrency.usdt) {
      require(usdtToken.transfer(_receiver, _amount), "transfer usdt error");
    } else {
      require(busdToken.transfer(_receiver, _amount), "transfer busd error");
    }
  }

  function _transferFundFOTA(address _receiver, uint _amount) private {
    require(fotaToken.transfer(_receiver, _amount), "transfer fota error");
  }

  function _transferNFTToken(IMarketPlace.OrderKind _kind, address _from, address _to, uint _tokenId) private {
    nftTokens[_kind].transferFrom(_from, _to, _tokenId);
  }

  function _shareOrderValue(IMarketPlace.OrderKind _kind, uint _tokenId, uint _totalShareAmount, IMarketPlace.PaymentCurrency _paymentCurrency) private {
    uint totalSharePercent = referralShare + creativeShare + treasuryShare;
    uint referralSharingAmount = referralShare * _totalShareAmount / totalSharePercent;
    uint treasurySharingAmount = treasuryShare * _totalShareAmount / totalSharePercent;
    uint creativeSharingAmount = creativeShare * _totalShareAmount / totalSharePercent;
    address inviter = citizen.getInviter(msg.sender);
    if (inviter == address(0)) {
      inviter = treasuryAddress;
    } else {
      bool validInviter = _validateInviter(inviter);
      if (!validInviter) {
        inviter = treasuryAddress;
      }
    }
    emit ReferralSent(inviter, msg.sender, referralSharingAmount, _paymentCurrency);
    _transferFund(inviter, referralSharingAmount, _paymentCurrency);

    address creator = nftTokens[_kind].getCreator(_tokenId);
    if (creator == address(0)) {
      creator = fundAdmin;
    }
    _transferFund(creator, creativeSharingAmount, _paymentCurrency);

    _transferFund(treasuryAddress, treasurySharingAmount, _paymentCurrency);
  }

  function _validateInviter(address _inviter) private view returns (bool) {
    return gameProxyContract.validateInviter(_inviter);
  }

  function _validatePaymentMethod(IMarketPlace.PaymentCurrency _paymentCurrency) private view {
    if (paymentType == IMarketPlace.PaymentType.fota) {
      require(_paymentCurrency == IMarketPlace.PaymentCurrency.fota, "paymentCurrency invalid");
    } else if (paymentType == IMarketPlace.PaymentType.usd) {
      require(_paymentCurrency != IMarketPlace.PaymentCurrency.fota, "paymentCurrency invalid");
    }
  }

  function _validateUser() private view {
    require(!lockedUser[msg.sender], "user locked");
  }

  function _validateHero(IMarketPlace.OrderType _type, IMarketPlace.OrderKind _kind, uint _tokenId, uint _startPrice, uint _endingPrice) private view {
    (,,,uint16 _id,, uint8 level,) = nftTokens[_kind].getHero(_tokenId);
    require(level >= minLevel, "level invalid");
    require(!lockedHeroClassId[_id], "MarketPlace: class hero locked");
    require(!nftTokens[_kind].lockedFromMKP(_tokenId), "hero locked");
    if(!allowMaxProfitTrading) {
      require(!nftTokens[_kind].reachMaxProfit(_tokenId), "MarketPlace: hero reached max profit");
    }

    if (_type == IMarketPlace.OrderType.trading) {
      require(_startPrice >= heroMinPrices[_id] && _endingPrice >= heroMinPrices[_id], "price invalid");
    }
  }

  function _validateItem(IMarketPlace.OrderType _type, IMarketPlace.OrderKind _kind, uint _tokenId, uint _startPrice, uint _endingPrice) private view {
    (uint gene, uint16 _class,,,) = nftTokens[_kind].getItem(_tokenId);
    if (eatherTransporter.openEather()) {
      require(gene == 0 || gene >= minGene, "gene invalid");
    } else {
      require(gene >= minGene, "MarketPlace: item gene invalid");
    }
    require(!lockedItemClassId[_class], "itemClassId locked");
    require(!lockedItemNFTId[_tokenId], "item locked");

    if (_type == IMarketPlace.OrderType.trading) {
      require(_startPrice >= itemMinPrices[_class] && _endingPrice >= itemMinPrices[_class], "405");
    }
  }

  // ADMIN FUNCTIONS

  function setContracts(address _heroNft, address _itemNft, address _treasury, address _fotaToken, address _busdToken, address _usdtToken, address _fotaPricer, address _citizen, address _gameProxyContract, address _eatherTransporter, address _energyManager, address _rewardManager) external onlyMainAdmin {
    nftTokens[IMarketPlace.OrderKind.hero] = IGameNFT(_heroNft);
    nftTokens[IMarketPlace.OrderKind.item] = IGameNFT(_itemNft);
    treasuryAddress = _treasury;
    fotaToken = IBEP20(_fotaToken);
    busdToken = IBEP20(_busdToken);
    usdtToken = IBEP20(_usdtToken);
    fotaPricer = IFOTAPricer(_fotaPricer);
    citizen = ICitizen(_citizen);
    gameProxyContract = IFOTAGame(_gameProxyContract);
    eatherTransporter = IEatherTransporter(_eatherTransporter);
    energyManager = IEnergyManager(_energyManager);
    rewardManager = IRewardManager(_rewardManager);
  }

  function setMinLevel(uint8 _minLevel) external onlyMainAdmin {
    require(_minLevel <= 25);
    minLevel = _minLevel;
    emit MinLevelChanged(_minLevel);
  }

  function setMinGene(uint8 _minGene) external onlyMainAdmin {
    minGene = _minGene;
    emit MinGeneChanged(_minGene);
  }

  function updatePaymentType(IMarketPlace.PaymentType _type) external onlyMainAdmin {
    paymentType = _type;
    emit PaymentTypeChanged(_type);
  }

//  function adminCancelOrder(IMarketPlace.OrderKind _kind, uint _tokenId) external onlyMainAdmin {
//    Order storage tradingOrder = tradingOrders[_kind][_tokenId];
//    address maker;
//    if (_isActive(tradingOrder)) {
//      maker = tradingOrder.maker;
//      _removeTradingOrder(_kind, _tokenId);
//      _transferNFTToken(_kind, address(this), maker, _tokenId);
//    } else {
//      Order storage rentingOrder = rentingOrders[_kind][_tokenId];
//      require(_isActive(rentingOrder));
//      maker = rentingOrder.maker;
//      _removeRentingOrder(_kind, _tokenId);
//      _transferNFTToken(_kind, address(this), maker, _tokenId);
//    }
//    emit OrderCanceledByAdmin(_kind, _tokenId);
//  }

  function updateLockUserStatus(address _user, bool _locked) external onlyMainAdmin {
    lockedUser[_user] = _locked;
    emit UserLocked(_user, _locked);
  }

  function updateLockHeroStatus(uint16 _id, bool _locked) external onlyMainAdmin {
    lockedHeroClassId[_id] = _locked;
    emit HeroClassIdLocked(_id, _locked);
  }

  function updateDiscounts(uint _fotaDiscount, uint _usdDiscount) external onlyMainAdmin {
    fotaDiscount = _fotaDiscount;
    usdDiscount = _usdDiscount;
    emit DiscountUpdated(fotaDiscount, usdDiscount);
  }

//  function updateLockItemStatus(uint16 _id, bool _locked) external onlyMainAdmin {
//    lockedItemClassId[_id] = _locked;
//    emit ItemClassIdLocked(_id, _locked);
//  }

//  function updateLockItemNFTIdStatus(uint _id, bool _locked) external onlyMainAdmin {
//    lockedItemNFTId[_id] = _locked;
//    emit ItemNFTLocked(_id, _locked);
//  }

  function setShares(uint _referralShare, uint _creatorShare, uint _treasuryShare) external onlyMainAdmin {
    require(_referralShare > 0 && _referralShare <= 10000);
    referralShare = _referralShare;
    require(_creatorShare > 0 && _creatorShare <= 10000);
    creativeShare = _creatorShare;
    require(_treasuryShare > 0 && _treasuryShare <= 10000);
    treasuryShare = _treasuryShare;
  }

  function updateFundAdmin(address _address) external onlyMainAdmin {
    require(_address != address(0));
    fundAdmin = _address;
  }

  function updateHeroPrice(uint16 _class, uint _price) external onlyMainAdmin {
    heroPrices[_class] = _price;
    emit HeroPriceUpdated(_class, _price);
  }

  function updateHeroMinPrice(uint16 _class, uint _price) external onlyMainAdmin {
    heroMinPrices[_class] = _price;
    emit HeroMinPriceUpdated(_class, _price);
  }

  function updateItemPrice(uint16 _class, uint _price) external onlyMainAdmin {
    itemPrices[_class] = _price;
    emit ItemPriceUpdated(_class, _price);
  }

  function updateItemMinPrice(uint16 _class, uint _price) external onlyMainAdmin {
    itemMinPrices[_class] = _price;
    emit ItemMinPriceUpdated(_class, _price);
  }

//  function updatePauseStatus(bool _paused) external onlyMainAdmin {
//    if(_paused) {
//      _pause();
//    } else {
//      _unpause();
//    }
//  }

  function setRemainingSale(IMarketPlace.OrderKind _kind, uint16 _classId, uint _remainingSale) external onlyMainAdmin {
    if (_kind == IMarketPlace.OrderKind.hero) {
      uint16 totalId = nftTokens[_kind].countId();
      require(_classId <= totalId, "classId invalid");
    }
    remainingSale[_kind][_classId] = _remainingSale;
    emit RemainingSaleUpdated(_kind, _classId, _remainingSale);
  }

  function updateMinRentingDuration(uint _minRentingDuration) external onlyMainAdmin {
    minRentingDuration = _minRentingDuration;
  }

  function updateSecondInADay(uint _secondInDay) external onlyMainAdmin {
    secondInADay = _secondInDay;
  }

  function updateAllowMaxProfitTrading(bool _allowed) external onlyMainAdmin {
    allowMaxProfitTrading = _allowed;
  }

}
