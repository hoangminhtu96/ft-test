// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

interface IEnergyManager {
  function updateEnergy(uint[] memory _heroIds, uint[] memory _energies) external returns (uint totalIdValue);
  function updatePoint(address _user, int _point) external;
  function getUserCurrentEnergy(address _user) external view returns (uint);
  function energies(address _user) external view returns (uint, uint, uint, int, uint);
}
