// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "../interfaces/IFOTAGame.sol";
import "../libs/fota/Auth.sol";
import "../interfaces/IFarm.sol";
import "../interfaces/IGameNFT.sol";

contract GameProxy is Auth {
  IFOTAGame public gamePve;
  IFOTAGame public gamePvp;
  IFOTAGame public gameDual;
  IFarm public farm;

  uint public farmPointCondition;

  IGameNFT public heroNft;
  uint public heroCondition;

  event HeroConditionUpdated(uint heroCondition, uint timestamp);

  function initialize(address _mainAdmin, address _heroNft) public initializer {
    super.initialize(_mainAdmin);
  }

  function validateInviter(address _inviter) external view returns (bool) {
    return heroNft.balanceOf(_inviter) >= heroCondition;
  }

  function updateHeroCondition(uint _heroCondition) external onlyMainAdmin {
    heroCondition = _heroCondition;
    emit HeroConditionUpdated(heroCondition, block.timestamp);
  }

  function setContracts(address _heroNft) external onlyMainAdmin {
    heroNft = IGameNFT(_heroNft);
  }
}
