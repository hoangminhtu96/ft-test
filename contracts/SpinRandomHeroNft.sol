// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "./libs/fota/Auth.sol";
import "./libs/fota/Math.sol";
import "./libs/zeppelin/token/BEP20/IBEP20.sol";
import "./interfaces/IGameNFT.sol";
import "./interfaces/ILPToken.sol";
import "./interfaces/IFOTAPricer.sol";
import "./interfaces/IFOTAToken.sol";
import "./interfaces/IMarketPlace.sol";

contract SpinRandomHeroNft is Auth, EIP712Upgradeable {

  struct Collection {
    string name;
    uint numberHeroReceive;
    uint price; // USDF
    bool canUpdate;
    uint[] rates;
    uint16[] heroClassIds;
    uint[] heroPrices;
  }

  mapping (uint => Collection) public collections;

  uint public collectionIndex;
  uint constant oneHundredPercentageDecimal3 = 100000;

  string private seed;
  address public fundAdmin;

  IGameNFT public heroNFT;
  ILPToken public lpToken;
  IFOTAPricer public fotaPricer;
  IFOTAToken public fotaToken;
  IBEP20 public busdToken;
  IBEP20 public usdtToken;
  IMarketPlace.PaymentType public paymentType;
  IBEP20 public otherPayment;
  uint[4] private discounts; // decimal 3

  event CollectionCreated(uint collectionId, string name, uint16[] classIds, uint[] rates, uint[] heroPrices, uint numberHeroReceive, uint price, uint timestamp);
  event CollectionUpdated(uint collectionId, string name, uint16[] classIds, uint[] rates, uint[] heroPrices, uint numberHeroReceive, uint price, uint timestamp);
  event SpinBonus(address user, uint collectionId, uint16[] heroClassIds, uint[] heroPices, uint spinPrice, uint discount, uint timestamp);
  event PaymentTypeChanged(IMarketPlace.PaymentType _newMethod);
  event DiscountUpdated(uint[4] discounts);

  modifier canUpdate(uint _collectionId) {
    require(collections[_collectionId].canUpdate, "SpinRandomHeroNft: can't update data");
    _;
  }

  function initialize(
    string memory _name,
    string memory _version,
    address _fundAdmin,
    address _heroNFT,
    address _lpToken,
    address _fotaPricer,
    string memory _seed
  ) public initializer {
    Auth.initialize(msg.sender);
    EIP712Upgradeable.__EIP712_init(_name, _version);
    heroNFT = IGameNFT(_heroNFT);
    lpToken = ILPToken(_lpToken);
    fundAdmin = _fundAdmin;
    fotaPricer = IFOTAPricer(_fotaPricer);

    fotaToken = IFOTAToken(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
    busdToken = IBEP20(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56);
    usdtToken = IBEP20(0x55d398326f99059fF775485246999027B3197955);

    seed = _seed;
    collectionIndex = 1;
    paymentType = IMarketPlace.PaymentType.all;
  }

  function getDiscounts() external view returns (uint[4] memory) {
    return discounts;
  }

  // ADMIN FUNCTION

  function createCollection(string calldata _name, uint16[] calldata _classIds, uint[] calldata _rates, uint[] calldata _heroPrices, uint _numberHeroReceive, uint _price) external onlyMainAdmin {
    require(_classIds.length == _rates.length && _rates.length == _heroPrices.length, "SpinRandomHeroNft: data invalid");
    Collection storage collection = collections[collectionIndex];
    collection.name = _name;
    collection.numberHeroReceive = _numberHeroReceive;
    collection.price = _price;
    collection.canUpdate = true;

    _updateCollectionHeroInfo(collectionIndex, _classIds, _rates, _heroPrices);
    _sortRatesHeroClassIdsAndHeroPrices(collectionIndex);

    emit CollectionCreated(collectionIndex, _name, _classIds, _rates, _heroPrices, _numberHeroReceive, _price, block.timestamp);
    collectionIndex++;
  }

  function updateCollection(uint _collectionId, string calldata _name, uint16[] calldata _classIds, uint[] calldata _rates, uint[] calldata _heroPrices, uint _numberHeroReceive, uint _price) external onlyMainAdmin canUpdate(_collectionId) {
    require(_classIds.length == _rates.length && _rates.length == _heroPrices.length, "SpinRandomHeroNft: data invalid");
    Collection storage collection = collections[_collectionId];
    collection.name = _name;
    collection.numberHeroReceive = _numberHeroReceive;
    collection.price = _price;

    _updateCollectionHeroInfo(_collectionId, _classIds, _rates, _heroPrices);
    _sortRatesHeroClassIdsAndHeroPrices(_collectionId);

    emit CollectionUpdated(_collectionId, _name, _classIds, _rates, _heroPrices, _numberHeroReceive, _price, block.timestamp);
  }

  function updateFundAdmin(address _address) onlyMainAdmin external {
    require(_address != address(0), "SpinRandomHeroNft: invalid address");
    fundAdmin = _address;
  }

  function setPaymentCurrencyToken(address _busd, address _usdt, address _fota, address _other) external onlyMainAdmin {
    require(_busd != address(0) && _usdt != address(0) && _fota != address(0), "SpinRandomHeroNft: invalid address");

    busdToken = IBEP20(_busd);
    usdtToken = IBEP20(_usdt);
    fotaToken = IFOTAToken(_fota);
    otherPayment = IBEP20(_other);
  }

  function updatePaymentType(IMarketPlace.PaymentType _type) external onlyMainAdmin {
    paymentType = _type;
    emit PaymentTypeChanged(_type);
  }

  function updateFotaPricerAndLpToken(address _fotaPricer, address _lpToken) external onlyMainAdmin {
    require(_fotaPricer != address(0) && _lpToken != address(0), "SpinRandomHeroNft: invalid address");
    fotaPricer = IFOTAPricer(_fotaPricer);
    lpToken = ILPToken(_lpToken);
  }

  function updateDiscounts(uint[4] calldata _discounts) external onlyMainAdmin {
    for (uint i = 0; i < _discounts.length; i++) {
      require(_discounts[i] >= 0 && _discounts[i] <= oneHundredPercentageDecimal3, "Invalid data");
    }
    discounts = _discounts;
    emit DiscountUpdated(discounts);
  }

  // USER FUNCTION
  function spin(uint _collectionId, IMarketPlace.PaymentCurrency _paymentCurrency) external {
    require(collections[_collectionId].heroClassIds.length > 0, "SpinRandomHeroNft: collection not found");

    (uint amount, uint discount) = _takeFund(collections[_collectionId].price, _paymentCurrency);
    (uint16[] memory classIds, uint[] memory heroPrices) = _giveReward(_collectionId);

    _mintHeroNft(classIds, heroPrices);

    collections[_collectionId].canUpdate = false;
    emit SpinBonus(msg.sender, _collectionId, classIds, heroPrices, amount, discount, block.timestamp);
  }

  function getCollectionDetail(uint _collectionId) public view returns(string memory name, uint16[] memory classIds, uint[] memory rates, uint[] memory heroPrices, uint numberHeroReceive, uint price) {
    Collection storage collection = collections[_collectionId];
    return (collection.name, collection.heroClassIds, collection.rates, collection.heroPrices, collection.numberHeroReceive, collection.price);
  }

  // PRIVATE FUNCTION

  function _takeFund(uint _price, IMarketPlace.PaymentCurrency _paymentCurrency) private returns (uint, uint) {
    if (paymentType == IMarketPlace.PaymentType.fota) {
      require(_paymentCurrency == IMarketPlace.PaymentCurrency.fota, "SpinRandomHeroNft: invalid currency");
    }

    if (paymentType == IMarketPlace.PaymentType.usd) {
      require(_paymentCurrency != IMarketPlace.PaymentCurrency.fota, "SpinRandomHeroNft: invalid currency");
    }

    uint amount = _price;
    IBEP20 token = fotaToken;
    uint discount;

    if (_paymentCurrency == IMarketPlace.PaymentCurrency.fota) {
      discount = discounts[0];
      amount = amount * 1000 / fotaPricer.fotaPrice();
    } else if(_paymentCurrency == IMarketPlace.PaymentCurrency.busd) {
      discount = discounts[1];
      token = busdToken;
    } else if(_paymentCurrency == IMarketPlace.PaymentCurrency.usdt) {
      discount = discounts[2];
      token = usdtToken;
    } else {
      require(address(otherPayment) != address(0), "SpinRandomHeroNft: not supported for now");
      token = otherPayment;
      discount = discounts[2];
    }
    amount = amount * (oneHundredPercentageDecimal3 - discount) / oneHundredPercentageDecimal3;

    require(token.allowance(msg.sender, address(this)) >= amount, "SpinRandomHeroNft: please approve token first");
    require(token.balanceOf(msg.sender) >= amount, "SpinRandomHeroNft: please fund your account");
    require(token.transferFrom(msg.sender, fundAdmin, amount), "SpinRandomHeroNft: transfer token failed");

    return (amount, discount);
  }

  function _mintHeroNft(uint16[] memory _classIds, uint[] memory _heroPrices) private {
    for (uint i = 0; i < _classIds.length; i += 1) {
      heroNFT.mintHero(msg.sender, _classIds[i], _heroPrices[i], i);
    }
  }

  function _updateCollectionHeroInfo(uint _collectionId, uint16[] calldata _classIds, uint[] calldata _rates, uint[] calldata _heroPrices) private {
    require(_classIds.length == _rates.length, "SpinRandomHeroNft: invalid classIds or rate");

    Collection storage collection = collections[_collectionId];
    require(_rates.length >= collection.numberHeroReceive, "SpinRandomHeroNft: invalid number hero receive");

    uint totalRatePercentage;

    for (uint i = 0; i < _classIds.length; i += 1) {
      require(_classIds[i] <= heroNFT.countId(), "SpinRandomHeroNft: class id not found");
      require(_rates[i] > 0 && _rates[i] <= oneHundredPercentageDecimal3, "SpinRandomHeroNft: rate must be great than 0 and less than or equal 100000");
      if (i + 1 < _classIds.length) {
        require(_classIds[i] < _classIds[i + 1], "SpinRandomHeroNft: invalid class id");
      }

      totalRatePercentage += _rates[i];
    }

    require(totalRatePercentage == collection.numberHeroReceive * oneHundredPercentageDecimal3, "SpinRandomHeroNft: invalid total rate");

    collection.rates = _rates;
    collection.heroClassIds = _classIds;
    collection.heroPrices = _heroPrices;
  }

  function _sortRatesHeroClassIdsAndHeroPrices(uint _collectionId) private {
    Collection storage collection = collections[_collectionId];
    uint rateLength = collection.rates.length;

    for (uint i = 0; i < rateLength - 1; i++) {
      for (uint j = rateLength - 1; j > i ; j--) {
        if (collection.rates[j] > collection.rates[j - 1]) {
          (collection.rates[j], collection.rates[j - 1]) = (collection.rates[j - 1], collection.rates[j]);
          (collection.heroClassIds[j], collection.heroClassIds[j - 1]) = (collection.heroClassIds[j - 1], collection.heroClassIds[j]);
          (collection.heroPrices[j], collection.heroPrices[j - 1]) = (collection.heroPrices[j - 1], collection.heroPrices[j]);
        }
      }
    }
  }

  function _giveReward(uint _collectionId) private view returns (uint16[] memory classIds, uint[] memory heroPrices) {
    Collection storage collection = collections[_collectionId];
    uint16[] memory tempHeroClassIds = new uint16[](collection.numberHeroReceive);
    uint[] memory tempHeroPrices = new uint[](collection.numberHeroReceive);
    uint totalHeroAssigned;

    for (uint i = 0; i < collection.rates.length; i += 1) {
      if (totalHeroAssigned == collection.numberHeroReceive) {
        break;
      }

      if (collection.rates.length - i == collection.numberHeroReceive - totalHeroAssigned || _genRandomRate(collection.rates[i]) <= collection.rates[i]) {
        tempHeroClassIds[totalHeroAssigned] = collection.heroClassIds[i];
        tempHeroPrices[totalHeroAssigned] = collection.heroPrices[i];
        totalHeroAssigned++;
      }
    }

    return (tempHeroClassIds, tempHeroPrices);
  }

  function _genRandomRate(uint rate) private view returns (uint) {
    (uint reserve0, uint reserve1) = lpToken.getReserves();

    return Math.genRandomNumberInRangeUint(seed, reserve0 + reserve1 + rate, 0, oneHundredPercentageDecimal3 - 1);
  }
}
