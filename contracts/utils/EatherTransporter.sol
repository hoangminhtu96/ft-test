// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "../libs/fota/Auth.sol";
import "../interfaces/IMarketPlace.sol";
import "../interfaces/IGameNFT.sol";

contract EatherTransporter is Auth {
  bool public openEather;
  IGameNFT public itemNFT;

  event OpenEatherUpdated(bool opened);

  function initialize(
    address _mainAdmin,
    address _itemNFT
  ) public initializer {
    Auth.initialize(_mainAdmin);
    itemNFT = IGameNFT(_itemNFT);
  }

  function transferEather(address _to, uint _tokenId) external {
    require(openEather, "you can't do this now");
    require(itemNFT.ownerOf(_tokenId) == msg.sender, "not owner");
    (uint gene,,,,) = itemNFT.getItem(_tokenId);
    require(gene == 0, "invalid gene");
    itemNFT.transferFrom(msg.sender, _to, _tokenId);
  }

  function updateOpenEather(bool _opened) external onlyMainAdmin {
    openEather = _opened;
    emit OpenEatherUpdated(_opened);
  }

  function setContracts(address _itemNft) external onlyMainAdmin {
    itemNFT = IGameNFT(_itemNft);
  }
}
