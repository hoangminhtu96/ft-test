// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";
import "../interfaces/IGameNFT.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract INODistributor is Auth, EIP712Upgradeable {

  IGameNFT public heroNFT;
  mapping(address => bool) public claimMarker;
  mapping (address => uint) public nonces;

  event Claimed(address _address, uint16 _heroClassId, uint _heroPrice, uint[] _tokenIds);

  function initialize(
    string memory _name,
    string memory _version,
    address _mainAdmin,
    address _heroNFT
  ) public initializer {
    Auth.initialize(_mainAdmin);
    EIP712Upgradeable.__EIP712_init(_name, _version);
    heroNFT = IGameNFT(_heroNFT);
  }

  // PUBLIC FUNCTIONS

  function claim(bytes[] memory _signatures, uint16[] memory _heroClassIds, uint[] memory _heroPrices, uint[] memory _amounts) external {
    require(!claimMarker[msg.sender], 'INODistributor: Drop already claimed.');
    claimMarker[msg.sender] = true;
    require(_signatures.length == _heroClassIds.length && _heroClassIds.length == _heroPrices.length && _heroPrices.length == _amounts.length, "INODistributor: data invalid");
    for (uint i = 0; i < _signatures.length; i++) {
      _validateSignature(_signatures[i], _heroClassIds[i], _heroPrices[i], _amounts[i], nonces[msg.sender]);
      uint[] memory ids = new uint[](_amounts[i]);
      for (uint j = 0; j < _amounts[i]; j++) {
        ids[j] = heroNFT.mintHero(msg.sender, _heroClassIds[i], _heroPrices[i], j);
      }
      emit Claimed(msg.sender, _heroClassIds[i], _heroPrices[i], ids);
    }
    nonces[msg.sender]++;
  }

  // PRIVATE FUNCTIONS

  function _validateSignature(bytes memory _signature, uint16 _heroClassId, uint _heroPrice, uint _amount, uint _nonce) private view {
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        keccak256("Claim(address user,uint256 heroClassId,uint256 heroPrice,uint256 amount,uint256 nonce)"),
        msg.sender,
        _heroClassId,
        _heroPrice,
        _amount,
        _nonce
      )));
    address signer = ECDSAUpgradeable.recover(digest, _signature);
    require(signer == contractAdmin, "MessageVerifier: invalid signature");
    require(signer != address(0), "ECDSAUpgradeable: invalid signature");
  }
}
