// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

interface IPVP {
  function getUserTodayLose(address _user) external view returns (uint);
}
