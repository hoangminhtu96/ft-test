// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

interface IMarketPlaceV2 {
  function revokeHeroes(uint16[] calldata _classIds) external;
  function revokeOrders(uint[] calldata _orderIds, uint[] calldata _receivers) external;
}
