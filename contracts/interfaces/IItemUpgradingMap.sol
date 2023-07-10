// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

interface IItemUpgradingMap {
  function getItem(uint16 _itemClass) external view returns (uint16[] memory, uint, uint8);
}
