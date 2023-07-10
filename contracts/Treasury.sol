// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "./interfaces/IMarketPlace.sol";
import "./libs/fota/Auth.sol";
import "./interfaces/IFOTAToken.sol";
import "./MarketPlace.sol";

contract Treasury is Auth {
  IMarketPlace public marketPlace;
  IFOTAToken public fotaToken;
  IFOTAToken public busdToken;
  IFOTAToken public usdtToken;
  IGameNFT public heroToken;
  IGameNFT public itemToken;

  function initialize(address _mainAdmin, address _heroToken, address _itemToken) public initializer {
    Auth.initialize(_mainAdmin);
    mainAdmin = _mainAdmin;
    fotaToken = IFOTAToken(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
    busdToken = IFOTAToken(0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56);
    usdtToken = IFOTAToken(0x55d398326f99059fF775485246999027B3197955);
    heroToken = IGameNFT(_heroToken);
    itemToken = IGameNFT(_itemToken);
  }

  function setMarketPlace(address _marketPlace) external onlyMainAdmin {
    require(_marketPlace != address(0), "Treasury: invalid address");
    marketPlace = IMarketPlace(_marketPlace);
    fotaToken.approve(_marketPlace, type(uint).max);
    busdToken.approve(_marketPlace, type(uint).max);
    usdtToken.approve(_marketPlace, type(uint).max);
  }

  function burnFOTA(uint _amount) external onlyMainAdmin {
    require(fotaToken.balanceOf(address(this)) >= _amount, "Treasury: amount invalid");
    fotaToken.burn(_amount);
  }

  function burnBUSD(uint _amount) external onlyMainAdmin {
    require(busdToken.balanceOf(address(this)) >= _amount, "Treasury: amount invalid");
    busdToken.burn(_amount);
  }

  function burnUSDT(uint _amount) external onlyMainAdmin {
    require(usdtToken.balanceOf(address(this)) >= _amount, "Treasury: amount invalid");
    usdtToken.burn(_amount);
  }

  function claimFOTA(address _address, uint _amount) external onlyMainAdmin {
    require(fotaToken.balanceOf(address(this)) >= _amount, "Treasury: amount invalid");
    fotaToken.transfer(_address, _amount);
  }

  function claimBUSD(address _address, uint _amount) external onlyMainAdmin {
    require(busdToken.balanceOf(address(this)) >= _amount, "Treasury: amount invalid");
    busdToken.transfer(_address, _amount);
  }

  function claimUSDT(address _address, uint _amount) external onlyMainAdmin {
    require(usdtToken.balanceOf(address(this)) >= _amount, "Treasury: amount invalid");
    usdtToken.transfer(_address, _amount);
  }

  function buyBack(IMarketPlace.OrderKind _kind, uint[] calldata _tokenIds, IMarketPlace.PaymentCurrency _paymentCurrency) external onlyMainAdmin {
    IGameNFT token = heroToken;
    if (_kind == IMarketPlace.OrderKind.item) {
      token = itemToken;
    }
    for(uint i = 0; i < _tokenIds.length; i++) {
      marketPlace.takeOrder(_kind, _tokenIds[i], _paymentCurrency);
      token.burn(_tokenIds[i]);
    }
  }

  function setContracts(address _heroNft, address _itemNft, address _fotaToken, address _busdToken, address _usdtToken) external onlyMainAdmin {
    heroToken = IGameNFT(_heroNft);
    itemToken = IGameNFT(_itemNft);
    fotaToken = IFOTAToken(_fotaToken);
    busdToken = IFOTAToken(_busdToken);
    usdtToken = IFOTAToken(_usdtToken);
  }
}
