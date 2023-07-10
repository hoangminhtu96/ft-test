// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

interface IRewardManager {
  function addPVEReward(address _user, uint[] memory _data) external;
  function addPVPReward(address _user, int _gem) external;
  function getDaysPassed() external view returns (uint);
  function gemRate() external view returns (uint);
  function summonHero(address _user, uint _amount) external;
  function summonPrestigeHero(address _user, uint _amount) external;
}
