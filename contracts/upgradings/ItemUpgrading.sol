// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "../interfaces/IGameNFT.sol";
import "../interfaces/IItemUpgradingMap.sol";
import "../interfaces/IMarketPlace.sol";
import "../interfaces/IGameNFT.sol";
import "../interfaces/IMarketPlace.sol";
import "../interfaces/IFOTAPricer.sol";
import "../interfaces/ILPToken.sol";
import "../libs/fota/Auth.sol";
import "../libs/fota/Math.sol";
import "../libs/zeppelin/token/BEP20/IBEP20.sol";

contract ItemUpgrading is Auth, EIP712Upgradeable {
  using Math for uint;

  struct UpgradingInfo {
    uint16 itemClass;
    uint[] materials;
    uint eatherId;
    IMarketPlace.PaymentCurrency paymentCurrency;
    uint8 acceptedRatio;
  }

  IGameNFT public itemNft;
  IItemUpgradingMap itemMap;
  IBEP20 public busdToken;
  IBEP20 public usdtToken;
  IBEP20 public fotaToken;
  IFOTAPricer public fotaPricer;
  IMarketPlace.PaymentType public paymentType;
  ILPToken[] public lpTokens;
  address[] public pools;
  address public fundAdmin;
  uint constant decimal3 = 1000;
  mapping (address => uint) public nonces;

  event PaymentTypeChanged(IMarketPlace.PaymentType newMethod);
  event Upgraded(address indexed _user, uint8 _gene, UpgradingInfo upgradingInfo, uint _newTokenId, uint _fee, uint8 _acceptedRatio, bool success);

  function initialize(
    string memory _name,
    string memory _version,
    address _mainAdmin,
    address _fundAdmin,
    address _itemNft,
    address _itemMap,
    address _fotaPricer,
    address[] calldata _pools
  ) public initializer {
    Auth.initialize(_mainAdmin);
    EIP712Upgradeable.__EIP712_init(_name, _version);
    itemNft = IGameNFT(_itemNft);
    itemMap = IItemUpgradingMap(_itemMap);
    fotaPricer = IFOTAPricer(_fotaPricer);
    busdToken = IBEP20(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56);
    usdtToken = IBEP20(0x55d398326f99059fF775485246999027B3197955);
    fotaToken = IBEP20(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
    lpTokens = new ILPToken[](3);
    lpTokens[0] = ILPToken(0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE);
    lpTokens[1] = ILPToken(0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16);
    lpTokens[2] = ILPToken(0xd5F81B5B84ea7b5157A72d3Fe32154dF8efC8B01);
    pools = _pools;
    fundAdmin = _fundAdmin;
  }

  function upgradeItem(
    uint16 _itemClass,
    uint[] calldata _materials,
    uint _eatherId,
    IMarketPlace.PaymentCurrency _paymentCurrency,
    uint8 _acceptedRatio,
    string calldata _seed,
    bytes memory _signature
  ) external {
    _validateSeed(_seed, _signature);
    _validateRatio(_itemClass, _acceptedRatio);
    (uint ownPriceFeeWhenSuccess, uint fee, uint totalOwnPrice, uint eatherOwnPrice) = _validateMaterials(_itemClass, _materials, _eatherId, _paymentCurrency, _acceptedRatio);
    UpgradingInfo memory upgradingInfo = UpgradingInfo(_itemClass, _materials, _eatherId, _paymentCurrency, _acceptedRatio);
    bool success = _upgradeItem(upgradingInfo, _acceptedRatio, _seed, ownPriceFeeWhenSuccess, fee);

    _finishUpgrade(success, _materials, fee, totalOwnPrice, eatherOwnPrice);
  }

  function setContracts(address _itemNft, address _itemMap) external onlyMainAdmin {
    itemNft = IGameNFT(_itemNft);
    itemMap = IItemUpgradingMap(_itemMap);
  }

  function updateFundAdmin(address _address) onlyMainAdmin external {
    require(_address != address(0), "MarketPlace: invalid address");
    fundAdmin = _address;
  }

  function updatePaymentType(IMarketPlace.PaymentType _type) external onlyMainAdmin {
    paymentType = _type;
    emit PaymentTypeChanged(_type);
  }

  function updateLPToken(address _tokenAddress0, address _tokenAddress1, address _tokenAddress2) external onlyMainAdmin {
    require(_tokenAddress0 != address(0), "Invalid address");
    lpTokens[0] = ILPToken(_tokenAddress0);
    lpTokens[1] = ILPToken(_tokenAddress1);
    lpTokens[2] = ILPToken(_tokenAddress2);
  }

  function updatePoolAddress(address[] calldata _pools) external onlyMainAdmin {
    pools = _pools;
  }

  function drainToken(address _tokenAddress) external onlyMainAdmin {
    IBEP20 token = IBEP20(_tokenAddress);
    token.transfer(msg.sender, token.balanceOf(address(this)));
  }

  // PRIVATE FUNCTIONS

  function _validateSeed(
    string calldata _seed,
    bytes memory _signature
  ) private {
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        keccak256("UpgradeItem(address user,string seed,uint256 nonce)"),
        msg.sender,
        keccak256(bytes(_seed)),
        nonces[msg.sender]
      )));
    nonces[msg.sender]++;
    address signer = ECDSAUpgradeable.recover(digest, _signature);
    require(signer == contractAdmin, "MessageVerifier: invalid signature");
    require(signer != address(0), "ECDSAUpgradeable: invalid signature");
  }

  function _validateMaterials(
    uint16 _itemClass,
    uint[] calldata _suppliedMaterialIds,
    uint _eatherId,
    IMarketPlace.PaymentCurrency _paymentCurrency,
    uint8 _acceptedRatio
  ) private returns (uint ownPriceFeeWhenSuccess, uint fee, uint totalOwnPrice, uint eatherOwnPrice) {
    ownPriceFeeWhenSuccess = 0;
    fee = 0;
    totalOwnPrice = 0;
    (uint16[] memory materials,,) = itemMap.getItem(_itemClass);
    require(materials.length == _suppliedMaterialIds.length, "Upgrading: invalid input");
    for(uint i = 0; i < _suppliedMaterialIds.length; i++) {
      uint tokenId = _suppliedMaterialIds[i];
      _requireItemRight(tokenId);
      (,uint16 suppliedMaterialClass,,uint suppliedItemOwnPrice,uint suppliedFailedUpgradingAmount) = itemNft.getItem(tokenId);
      ownPriceFeeWhenSuccess += suppliedItemOwnPrice;
      ownPriceFeeWhenSuccess += suppliedFailedUpgradingAmount;
      totalOwnPrice += suppliedItemOwnPrice;
      require(suppliedMaterialClass == materials[i], "Upgrading: invalid class");
    }
    eatherOwnPrice = _validateEather(_eatherId);
    fee = _takeFund(_paymentCurrency, _itemClass, _acceptedRatio);
    ownPriceFeeWhenSuccess += eatherOwnPrice;
    ownPriceFeeWhenSuccess += fee;
  }

  function _validateEather(uint _eatherId) private view returns (uint) {
    _requireItemRight(_eatherId);
    (uint16 eatherGene,,,uint eatherOwnPrice,) = itemNft.getItem(_eatherId);
    require(eatherGene == 0, "Upgrading: invalid eather item");
    return eatherOwnPrice;
  }

  function _requireItemRight(uint _tokenId) private view {
    require(itemNft.ownerOf(_tokenId) == msg.sender, "Upgrading: not owner of item");
    bool approved = itemNft.isApprovedForAll(msg.sender, address(this)) || itemNft.getApproved(_tokenId) == address(this);
    require(approved, "Upgrading: please approve token first");
  }

  function _takeFund(IMarketPlace.PaymentCurrency _paymentCurrency, uint16 _itemClass, uint8 _acceptedRatio) private returns (uint _upgradingFee){
    (,uint fee,uint8 successRatio) = itemMap.getItem(_itemClass);
    _upgradingFee = fee * uint(_acceptedRatio) / uint(successRatio);
    if (paymentType == IMarketPlace.PaymentType.fota) {
      _takeFundFOTA(_upgradingFee * decimal3 / fotaPricer.fotaPrice());
    } else if (paymentType == IMarketPlace.PaymentType.usd) {
      _takeFundUSD(_paymentCurrency, _upgradingFee);
    } else if (_paymentCurrency == IMarketPlace.PaymentCurrency.fota) {
      _takeFundFOTA(_upgradingFee * decimal3 / fotaPricer.fotaPrice());
    } else {
      _takeFundUSD(_paymentCurrency, _upgradingFee);
    }
  }

  function _takeFundUSD(IMarketPlace.PaymentCurrency _paymentCurrency, uint _upgradingFee) private {
    require(_paymentCurrency != IMarketPlace.PaymentCurrency.fota, "payment currency invalid");
    IBEP20 usdToken = _paymentCurrency == IMarketPlace.PaymentCurrency.busd ? busdToken : usdtToken;
    require(usdToken.allowance(msg.sender, address(this)) >= _upgradingFee, "Upgrading: please approve usd token first");
    require(usdToken.balanceOf(msg.sender) >= _upgradingFee, "Upgrading: insufficient balance");
    require(usdToken.transferFrom(msg.sender, address(this), _upgradingFee), "Upgrading: transfer usd token failed");
    require(usdToken.transfer(fundAdmin, _upgradingFee), "Upgrading: transfer usd token failed");
  }

  function _takeFundFOTA(uint _upgradingFee) private {
    require(fotaToken.allowance(msg.sender, address(this)) >= _upgradingFee, "please approve fota first");
    require(fotaToken.balanceOf(msg.sender) >= _upgradingFee, "please fund your account");
    require(fotaToken.transferFrom(msg.sender, address(this), _upgradingFee), "transfer fota failed");
    uint dividend = _upgradingFee / pools.length;
    for(uint i = 0; i < pools.length; i++) {
      fotaToken.transfer(pools[i], dividend);
    }
  }

  function _upgradeItem(
    UpgradingInfo memory _upgradingInfo,
    uint8 _acceptedRatio,
    string calldata _seed,
    uint _ownPrice,
    uint _fee
  ) private returns (bool success) {
    success = _isSuccess(_seed, _acceptedRatio);
    uint8 gene = uint8(_upgradingInfo.itemClass / 100);
    if (success) {
      uint newTokenId = itemNft.mintItem(msg.sender, gene, _upgradingInfo.itemClass, _ownPrice, 0);
      emit Upgraded(msg.sender, gene, _upgradingInfo, newTokenId, _fee, _acceptedRatio, success);
    } else {
      emit Upgraded(msg.sender, gene, _upgradingInfo, 0, _fee, _acceptedRatio, success);
    }
    itemNft.burn(_upgradingInfo.eatherId);
  }

  function _isSuccess(string calldata _seed, uint8 _acceptedRatio) private view returns (bool) {
    uint dexSeed = _getDexSeed();
    uint8 randomNumber = Math.genRandomNumber(_seed, dexSeed);
    return randomNumber < _acceptedRatio;
  }

  function _getDexSeed() private view returns (uint) {
    (uint reserve00,) = lpTokens[0].getReserves();
    (uint reserve01,) = lpTokens[1].getReserves();
    (uint reserve02,) = lpTokens[2].getReserves();
    return reserve00.add(reserve01).add(reserve02);
  }

  function _validateRatio(uint16 _itemClass, uint8 _acceptedRatio) private view {
    (,,uint8 successRatio) = itemMap.getItem(_itemClass);
    require(_acceptedRatio <= successRatio, "Upgrading: invalid ratio");
  }

  function _finishUpgrade(
    bool _success,
    uint[] memory _materials,
    uint _fee,
    uint _totalMaterialOwnPrice,
    uint _eatherOwnPrice
  ) private {
    if (_success) {
      for(uint i = 0; i < _materials.length; i++) {
        itemNft.burn(_materials[i]);
      }
    } else {
      uint _totalFee = _fee + _eatherOwnPrice;
      for(uint i = 0; i < _materials.length; i++) {
        (,,,uint suppliedItemOwnPrice, uint failedUpgradingAmount) = itemNft.getItem(_materials[i]);
        uint itemFee = _totalFee.mul(suppliedItemOwnPrice).div(_totalMaterialOwnPrice);
        itemNft.updateFailedUpgradingAmount(_materials[i], failedUpgradingAmount.add(itemFee));
      }
    }
  }

  // TODO for testing purpose
  function setToken(address _fotaToken, address _busdToken, address _usdtToken, address _lpToken) external onlyMainAdmin {
    fotaToken = IBEP20(_fotaToken);
    busdToken = IBEP20(_busdToken);
    usdtToken = IBEP20(_usdtToken);
    lpTokens[0] = ILPToken(_lpToken);
    lpTokens[1] = ILPToken(_lpToken);
    lpTokens[2] = ILPToken(_lpToken);
  }
}
