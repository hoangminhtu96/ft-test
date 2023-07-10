// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";
import "../libs/fota/MerkelProof.sol";
import "../interfaces/IGameNFT.sol";

contract ItemAirdropDistributor is Auth {

  IGameNFT public itemNFT;
  uint8 constant public itemGene = 1;
  uint16 public itemClassId;
  uint public itemPrice;

  bytes32 public rootHash;
  uint public quantityPerUser;
  mapping(address => bool) public claimMarker;

  event Claimed(address _address, uint[] _tokenIds);

  function initialize(
    address _mainAdmin,
    address _itemNFT
  ) public initializer {
    Auth.initialize(_mainAdmin);
    itemClassId = 121;
    itemPrice = 100e6;
    rootHash = 0x673a79ecaed9ed602a27ce985b1da73cf54e07a9f9980a7af1cf7e8bdd941eac;
    itemNFT = IGameNFT(_itemNFT);
  }

  // OWNER FUNCTIONS

  function setRootHash(bytes32 _rootHash) onlyMainAdmin external {
    rootHash = _rootHash;
  }

  function setItemPrice(uint _itemPrice) onlyMainAdmin external {
    itemPrice = _itemPrice;
  }

  function setItemClassId(uint16 _itemClassId) onlyMainAdmin external {
    itemClassId = _itemClassId;
  }

  function updateQuantityPerUser(uint _quantityPerUser) onlyMainAdmin external {
    quantityPerUser = _quantityPerUser;
  }

  // PUBLIC FUNCTIONS

  function claim(bytes32[] calldata _path) external {
    require(!claimMarker[msg.sender], 'AirdropDistributor: Drop already claimed.');
    bytes32 hash = keccak256(abi.encodePacked(msg.sender));
    require(MerkleProof.verify(_path, rootHash, hash), 'AirdropDistributor: 400');
    claimMarker[msg.sender] = true;
    uint[] memory ids = new uint[](quantityPerUser);
    for (uint i = 0; i < quantityPerUser; i++) {
      ids[i] = itemNFT.mintItem(msg.sender, itemGene, itemClassId, itemPrice, i);
    }
    emit Claimed(msg.sender, ids);
  }
}
