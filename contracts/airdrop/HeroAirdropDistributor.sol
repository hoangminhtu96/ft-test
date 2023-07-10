// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";
import "../libs/fota/MerkelProof.sol";
import "../interfaces/IGameNFT.sol";

contract HeroAirdropDistributor is Auth {

  IGameNFT public heroNFT;
  uint16 public heroClassId;
  uint public heroPrice;

  bytes32 public rootHash;
  uint public quantityPerUser;
  mapping(address => bool) public claimMarker;

  event Claimed(address _address, uint[] _tokenIds);

  function initialize(
    address _mainAdmin,
    address _heroNFT
  ) public initializer {
    Auth.initialize(_mainAdmin);
    heroClassId = 17;
    heroPrice = 175e6;
    rootHash = 0x828893bda838607d8a03f0f0aef0fcb9b9a1ac9727259b27853e44dab74d1709;
    heroNFT = IGameNFT(_heroNFT);
  }

  // OWNER FUNCTIONS

  function setRootHash(bytes32 _rootHash) onlyMainAdmin external {
    rootHash = _rootHash;
  }

  function setHeroPrice(uint _heroPrice) onlyMainAdmin external {
    heroPrice = _heroPrice;
  }

  function setHeroClassId(uint16 _heroClassId) onlyMainAdmin external {
    heroClassId = _heroClassId;
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
    uint[] memory ids = heroNFT.airdrop(msg.sender, heroClassId, heroPrice, quantityPerUser);
    emit Claimed(msg.sender, ids);
  }
}
