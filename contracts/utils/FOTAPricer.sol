// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";

contract PriceAuth is Auth {
  address normalPriceAdmin;
  address minMaxPriceAdmin;
  address absMinMaxPriceAdmin;

  function initialize(
    address _mainAdmin,
    address _normalPriceAdmin,
    address _minMaxPriceAdmin,
    address _absMinMaxPriceAdmin
  ) public {
    Auth.initialize(_mainAdmin);
    normalPriceAdmin = _normalPriceAdmin;
    minMaxPriceAdmin = _minMaxPriceAdmin;
    absMinMaxPriceAdmin = _absMinMaxPriceAdmin;
  }

  modifier onlyNormalPriceAdmin() {
    require(msg.sender == normalPriceAdmin || _isMainAdmin(), "onlyNormalPriceAdmin");
    _;
  }

  modifier onlyMinMaxPriceAdmin() {
    require(msg.sender == minMaxPriceAdmin || _isMainAdmin(), "onlyMinMaxPriceAdmin");
    _;
  }

  modifier onlyAbsMinMaxPriceAdmin() {
    require(msg.sender == absMinMaxPriceAdmin || _isMainAdmin(), "onlyAbsMinMaxPriceAdmin");
    _;
  }

  function updateNormalPriceAdmin(address _normalPriceAdmin) onlyMainAdmin external {
    require(_normalPriceAdmin != address(0), "Invalid address");
    normalPriceAdmin = _normalPriceAdmin;
  }

  function updateMinMaxPriceAdmin(address _minMaxPriceAdmin) onlyMainAdmin external {
    require(_minMaxPriceAdmin != address(0), "Invalid address");
    minMaxPriceAdmin = _minMaxPriceAdmin;
  }

  function updateAbsMinMaxPriceAdmin(address _absMinMaxPriceAdmin) onlyMainAdmin external {
    require(_absMinMaxPriceAdmin != address(0), "Invalid address");
    absMinMaxPriceAdmin = _absMinMaxPriceAdmin;
  }

  function getMainAdmin() external view returns (address) {
    return mainAdmin;
  }
}

contract FOTAPricer is PriceAuth {

  uint public fotaPrice; // decimal 3
  uint public minPrice;
  uint public maxPrice;
  uint public absMinPrice;
  uint public absMaxPrice;

  event FOTAPriceSynced(
    uint newPrice,
    uint timestamp
  );
  event Warning(
    uint fotaPrice,
    uint minPrice,
    uint maxPrice,
    uint absMinPrice,
    uint absMaxPrice,
    uint minPriceSet,
    uint maxPriceSet
  );

  function initialize(
    address _mainAdmin,
    address _normalPriceAdmin,
    address _minMaxPriceAdmin,
    address _absMinMaxPriceAdmin,
    uint _fotaPrice
  ) public initializer {
    PriceAuth.initialize(_mainAdmin, _normalPriceAdmin, _minMaxPriceAdmin, _absMinMaxPriceAdmin);
    fotaPrice = _fotaPrice;
    absMinPrice = _fotaPrice / 3;
    absMaxPrice = _fotaPrice * 3;
    _updateMinMaxPrice(_fotaPrice * 90 / 100, fotaPrice * 105 / 100);
  }

  function syncFOTAPrice(uint _fotaPrice) external onlyNormalPriceAdmin {
    require(
      _fotaPrice >= minPrice &&
      _fotaPrice <= maxPrice &&
      _fotaPrice >= absMinPrice &&
      _fotaPrice <= absMaxPrice, "Price is invalid");
    fotaPrice = _fotaPrice;
    emit FOTAPriceSynced(fotaPrice, block.timestamp);
  }

  function updateMinMaxPrice(uint _minPrice, uint _maxPrice) external onlyMinMaxPriceAdmin {
    _updateMinMaxPrice(_minPrice, _maxPrice);
  }

  function updateAbsMinMaxPrice(uint _absMinPrice, uint _absMaxPrice) external onlyAbsMinMaxPriceAdmin {
    require(_absMaxPrice > _absMinPrice, "Price is invalid");
    absMinPrice = _absMinPrice;
    absMaxPrice = _absMaxPrice;
  }

  function _updateMinMaxPrice(uint _minPrice, uint _maxPrice) private {
    if (_minPrice < absMinPrice || _maxPrice > absMaxPrice) {
      emit Warning(fotaPrice, minPrice, maxPrice, absMinPrice, absMaxPrice, _minPrice, _maxPrice);
    } else {
      minPrice = _minPrice;
      maxPrice = _maxPrice;
    }
  }
}
