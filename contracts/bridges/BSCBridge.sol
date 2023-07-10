// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "../libs/fota/Auth.sol";
import "../interfaces/IFOTAToken.sol";

contract BSCBridge is Auth, EIP712Upgradeable {
  struct Config {
    IFOTAToken fotaToken;
    uint nonces;
    address signatureSigner;
  }

  Config public config;

  event ConfigUpdated(address fotaToken, address signatureSigner, uint timestamp);
  event BridgeRequested(address indexed requester, uint amount, uint timestamp);
  event TokenReleased(address[] receivers, uint[] quantities, uint totalQuantity, uint timestamp, uint[] timestamps);

  function initialize() public initializer {
    Auth.initialize(msg.sender);
    EIP712Upgradeable.__EIP712_init("BSCBridge", "1");
    config.fotaToken = IFOTAToken(0x69c3FF5F466757BF99feF916aE9a191d7c13696c);
    config.signatureSigner = msg.sender;
  }

  function bridge(uint _amount) external {
    _takeFundFOTA(_amount);
    emit BridgeRequested(msg.sender, _amount, block.timestamp);
  }

  // ADMIN FUNCTIONS

  function release(address[] calldata _receivers, uint[] calldata _quantities, uint _totalQuantity, bytes memory _signature, uint[] calldata _timestamps) external onlyContractAdmin {
    _validateSignature(_receivers.length, _totalQuantity, _signature);
    require(_receivers.length == _quantities.length, "Bridge: receivers and quantities must be the same length");
    require(config.fotaToken.balanceOf(address(this)) >= _totalQuantity, "Bridge: contract is insufficient balance");
    for(uint i = 0; i < _receivers.length; i++) {
      config.fotaToken.transfer(_receivers[i], _quantities[i]);
    }
    emit TokenReleased(_receivers, _quantities, _totalQuantity, block.timestamp, _timestamps);
  }

  function updateConfig(address _fotaToken, address _signatureSigner) external onlyMainAdmin {
    config.fotaToken = IFOTAToken(_fotaToken);
    config.signatureSigner = _signatureSigner;
    emit ConfigUpdated(_fotaToken, _signatureSigner, block.timestamp);
  }

  // PRIVATE FUNCTIONS

  function _takeFundFOTA(uint _amount) private {
    require(config.fotaToken.allowance(msg.sender, address(this)) >= _amount, "BSCBridge: please approve fota first");
    require(config.fotaToken.balanceOf(msg.sender) >= _amount, "BSCBridge: insufficient balance");
    config.fotaToken.transferFrom(msg.sender, address(this), _amount);
  }

  function _validateSignature(
    uint _totalReceivers,
    uint _totalQuantity,
    bytes memory _signature
  ) private {
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        keccak256("Release(uint256 totalReceivers,uint256 totalQuantity,uint256 nonce)"),
        _totalReceivers,
        _totalQuantity,
        config.nonces
      )));
    config.nonces++;
    address signer = ECDSAUpgradeable.recover(digest, _signature);
    require(signer == config.signatureSigner, "MessageVerifier: invalid signature");
    require(signer != address(0), "ECDSAUpgradeable: invalid signature");
  }
}
