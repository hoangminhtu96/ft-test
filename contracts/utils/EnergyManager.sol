// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "../interfaces/IGameNFT.sol";
import "../interfaces/IMarketPlace.sol";
import "../interfaces/IEnergyManager.sol";
import "../interfaces/IEnergyManager.sol";

abstract contract EnergyAuth is Auth, ContextUpgradeable {
  mapping(address => bool) gameContracts;
  mapping(address => bool) pointContracts;

  function initialize(address _mainAdmin) virtual override public {
    Auth.initialize(_mainAdmin);
  }

  modifier onlyGameContract() {
    require(_isGameContracts() || _isMainAdmin(), "EnergyAuth: Only game contract");
    _;
  }

  function _isGameContracts() internal view returns (bool) {
    return gameContracts[_msgSender()];
  }

  function updateGameContract(address _contract, bool _status) onlyMainAdmin external {
    require(_contract != address(0), "EnergyAuth: Address invalid");
    gameContracts[_contract] = _status;
  }
}

contract EnergyManager is EnergyAuth {
  struct Energy {
    uint amount;
    uint from;
    uint to;
  }
  IGameNFT public heroNft;
  mapping (uint => Energy) public energies;
  uint public secondInADay;
  uint public energyPerDayPerHero;

  event EnergyConditionUpdated(uint energyPerDayPerHero, uint timestamp);
  event EnergyUpdated(uint indexed heroId, uint remainingEnergy, address gameAddress);
  event EnergySecondInADayUpdated(uint secondInADay, uint timestamp);

  function initialize(address _mainAdmin) override public initializer {
    super.initialize(_mainAdmin);
    secondInADay = 604800; // 7 * 24 * 60 * 60
  }

  function updateEnergy(uint[] memory _heroIds, uint[] memory _energies) external onlyGameContract returns (uint totalValue) {
    uint startOfDay = _getStartOfDay();
    totalValue = 0;
    for (uint i = 0; i < _heroIds.length; i++) {
      require(!heroNft.reachMaxProfit(_heroIds[i]), "EnergyManager: hero reached max profit");
      totalValue += (_heroIds[i] + _energies[i]);
      Energy storage energy = energies[_heroIds[i]];
      bool firstConsumeInDay = block.timestamp > energy.to;
      if (firstConsumeInDay) {
        uint todayEnergy = energyPerDayPerHero;
        require(todayEnergy >= _energies[i], "EnergyManager: data invalid");
        energy.amount = todayEnergy - _energies[i];
        energy.from = startOfDay;
        energy.to = energy.from + secondInADay;
      } else {
        require(energy.amount >= _energies[i], "EnergyManager: consume amount invalid");
        energy.amount -= _energies[i];
      }
      emit EnergyUpdated(_heroIds[i], energy.amount, msg.sender);
    }
  }

  // PRIVATE FUNCTIONS

  function _getStartOfDay() private view returns (uint) {
    return block.timestamp - block.timestamp % secondInADay;
  }

  // ADMIN FUNCTIONS

  function updateSecondInADay(uint _secondInDay) external onlyMainAdmin {
    secondInADay = _secondInDay;
    emit EnergySecondInADayUpdated(_secondInDay, block.timestamp);
  }

  function updateEnergyCondition(uint _energyPerDayPerHero) external onlyMainAdmin {
    energyPerDayPerHero = _energyPerDayPerHero;
    emit EnergyConditionUpdated(energyPerDayPerHero, block.timestamp);
  }

  function setContracts(address _heroNft) external onlyMainAdmin {
    heroNft = IGameNFT(_heroNft);
  }
}
