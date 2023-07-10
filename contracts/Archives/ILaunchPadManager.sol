// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

interface ILaunchPadManager {
  function totalSupply(address _launchPad) external view returns (uint);
  function maxTotalSupply(address _launchPad) external view returns (uint);
  function mintHeroes(address _owner, uint16 _classId, uint _price, uint _quantity) external;
}
