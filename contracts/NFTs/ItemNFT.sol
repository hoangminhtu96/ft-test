// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";
import "../libs/fota/ArrayUtil.sol";
import "./BaseNFT.sol";
import "../interfaces/IFOTAPricer.sol";

contract ItemNFT is BaseNFT {
  using ArrayUtil for uint[];

  struct Item {
    uint8 gene;
    uint16 class;
    uint createdAt;
    uint ownPrice;
    uint failedUpgradingAmount;
  }

  mapping(uint => Item) public items;
  mapping(uint16 => bool) public classIds;
  mapping (uint16 => uint[7]) private strengthIndexReferences;
  uint public totalSupply;
  mapping (uint => uint) public fotaOwnPrices;
  IFOTAPricer public fotaPricer;
  mapping (uint => uint) public fotaFailedUpgradingAmount;

  event NewClassAdded(
    uint16 _gene,
    uint16 _classId
  );
  event BaseStrengthUpdated(
    uint16 classId,
    uint[7] baseStrength
  );
  event FailedUpgradingAmountUpdated(
    uint tokenId,
    uint amount
  );

  function initialize(
    address _mainAdmin,
    string calldata _name,
    string calldata _symbol
  ) override public initializer {
    BaseNFT.initialize(_mainAdmin, _name, _symbol);
  }

  function mintItem(address _owner, uint8 _gene, uint16 _class, uint _price, uint _index) onlyMintAdmin public returns (uint) {
    require(classIds[_class], "ClassId not exists");
    uint newId = _genNewId(_index);
    _mint(_owner, newId);
    Item memory item = Item(_gene, _class, block.timestamp, _price, 0);
    items[newId] = item;
    fotaOwnPrices[newId] = _convertUsdToFota(_price);
    return newId;
  }

  function mintItems(address _owner, uint8 _gene, uint16 _class, uint _price, uint _quantity) onlyMintAdmin external {
    for(uint i = 0; i < _quantity; i++) {
      mintItem(_owner, _gene, _class, _price, i);
    }
  }

  function mintUserItems(address[] calldata _owners, uint8[] calldata _genes, uint16[] calldata _classIds, uint[] calldata _price, uint[] calldata _fotaPrice) onlyMintAdmin external {
    for(uint i = 0; i < _owners.length; i++) {
      address owner = _owners[i];
      uint16 class = _classIds[i];
      uint8 gene = _genes[i];
      uint price = _price[i];
      require(classIds[class], "ClassId not exists");
      uint newId = _genNewId(i);
      _mint(owner, newId);
      Item memory item = Item(gene, class, block.timestamp, price, 0);
      items[newId] = item;
      fotaOwnPrices[newId] = _fotaPrice[i];
    }
  }

  function _beforeTokenTransfer(
    address _from,
    address _to,
    uint256 _tokenId
  ) internal override {
    super._beforeTokenTransfer(_from, _to, _tokenId);
    if (_to == address(0)) {
      delete items[_tokenId];
    }
    if (_from == address(0)) {
      totalSupply++;
    } else if (_to == address(0)) {
      totalSupply--;
    }
  }

  function getItem(uint _tokenId) public view returns (uint8, uint16, uint, uint, uint) {
    return (
      items[_tokenId].gene,
      items[_tokenId].class,
      items[_tokenId].createdAt,
      items[_tokenId].ownPrice,
      items[_tokenId].failedUpgradingAmount
    );
  }

  function getStrengthIndexReferences(uint16 _classId) external view returns (uint, uint, uint, uint, uint, uint, uint) {
    return (
      strengthIndexReferences[_classId][0],
      strengthIndexReferences[_classId][1],
      strengthIndexReferences[_classId][2],
      strengthIndexReferences[_classId][3],
      strengthIndexReferences[_classId][4],
      strengthIndexReferences[_classId][5],
      strengthIndexReferences[_classId][6]
    );
  }

  function getClassId(uint _tokenId) public view returns (uint16) {
    return items[_tokenId].class;
  }

  function getCreator(uint _tokenId) override external view returns (address) {
    return creators[items[_tokenId].class];
  }

  // ADMIN FUNCTIONS

  function updateBaseStrengths(uint16 _classId, uint[7] calldata _strengths) external onlyMainAdmin {
    strengthIndexReferences[_classId] = _strengths;
    emit BaseStrengthUpdated(_classId, _strengths);
  }

  function addItemClass(uint8 _gene, uint16 _classId, address _creator, uint[7] calldata _strengths) external onlyMainAdmin {
    require(!classIds[_classId], "ClassId exists");
    classIds[_classId] = true;
    creators[_classId] = _creator;
    strengthIndexReferences[_classId] = _strengths;
    emit NewClassAdded(_gene, _classId);
  }

  function updateOwnPrice(uint _tokenId, uint _ownPrice) override onlyMintAdmin external {
    Item storage item = items[_tokenId];
    item.ownPrice = _ownPrice;
    fotaOwnPrices[_tokenId] = _convertUsdToFota(_ownPrice);
    emit OwnPriceUpdated(_tokenId, _ownPrice);
  }

  function updateFailedUpgradingAmount(uint _tokenId, uint _amount) onlyMintAdmin external {
    Item storage item = items[_tokenId];
    item.failedUpgradingAmount = _amount;
    emit FailedUpgradingAmountUpdated(_tokenId, _amount);
  }

  function syncTotalSupply(uint _totalSupply) onlyMainAdmin external {
    totalSupply = _totalSupply;
  }

  function setFOTAPricer(address _fotaPricer) external onlyMainAdmin {
    fotaPricer = IFOTAPricer(_fotaPricer);
  }

  function syncFOTAOwnPrice(uint[] calldata _tokenIds, uint[] calldata _fotaOwnPrices) onlyMintAdmin external {
    require(_tokenIds.length == _fotaOwnPrices.length, "Data invalid");
    for (uint i = 0; i < _tokenIds.length; i++) {
      fotaOwnPrices[_tokenIds[i]] = _fotaOwnPrices[i];
      emit AllOwnPriceUpdated(_tokenIds[i], items[_tokenIds[i]].ownPrice, _fotaOwnPrices[i]);
    }
  }

  function _convertUsdToFota(uint _ownPrice) private view returns (uint) {
    return _ownPrice * 1000 / fotaPricer.fotaPrice();
  }
}
