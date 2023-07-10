// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "../libs/fota/Auth.sol";
import "../libs/zeppelin/token/BEP20/IBEP20.sol";

interface IFOTATokenP is IBEP20 {
  function mint(address _receiver, uint _amount) external;
  function burn(uint _amount) external;
}

contract PolygonBridge is Auth, EIP712Upgradeable {
  struct Config {
    IFOTATokenP fotaToken;
    uint nonces;
    address signatureSigner;
  }

  Config public config;

  event ConfigUpdated(address fotaToken, address signatureSigner, uint timestamp);
  event BridgeRequested(address indexed requester, uint amount, uint timestamp);
  event TokenReleased(address[] receivers, uint[] quantities, uint totalQuantity, uint timestamp, uint[] timestamps);

  function initialize() public initializer {
    Auth.initialize(msg.sender);
    EIP712Upgradeable.__EIP712_init("PolygonBridge", "1");
    config.fotaToken = IFOTATokenP(0xcfB4A6F1246A6ca91B9ca3e300FcBab3dFb9f0A8); // TODO
    config.signatureSigner = msg.sender;
  }

  function bridge(uint _amount) external {
    _burnFOTA(_amount);
    emit BridgeRequested(msg.sender, _amount, block.timestamp);
  }

  // ADMIN FUNCTIONS

  function release(address[] calldata _receivers, uint[] calldata _quantities, uint _totalQuantity, bytes memory _signature, uint[] calldata _timestamps) external onlyContractAdmin {
    _validateSignature(_receivers.length, _totalQuantity, _signature);
    require(_receivers.length == _quantities.length, "Bridge: receivers and quantities must be the same length");
    for(uint i = 0; i < _receivers.length; i++) {
      config.fotaToken.mint(_receivers[i], _quantities[i]);
    }
    emit TokenReleased(_receivers, _quantities, _totalQuantity, block.timestamp, _timestamps);
  }

  function updateConfig(address _fotaToken, address _signatureSigner) external onlyMainAdmin {
    config.fotaToken = IFOTATokenP(_fotaToken);
    config.signatureSigner = _signatureSigner;
    emit ConfigUpdated(_fotaToken, _signatureSigner, block.timestamp);
  }

  // PRIVATE FUNCTIONS

  function _burnFOTA(uint _amount) private {
    require(config.fotaToken.allowance(msg.sender, address(this)) >= _amount, "PolygonBridge: please approve fota first");
    require(config.fotaToken.balanceOf(msg.sender) >= _amount, "PolygonBridge: insufficient balance");
    config.fotaToken.transferFrom(msg.sender, address(this), _amount);
    config.fotaToken.burn(_amount);
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
