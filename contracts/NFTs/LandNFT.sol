// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "../libs/fota/NFTAuth.sol";

contract LandNFT is NFTAuth, ERC721Upgradeable {
  uint public totalSupply;
  mapping (uint => address) public creators;

  function initialize(
    address _mainAdmin,
    string calldata _name,
    string calldata _symbol
  ) public initializer {
    NFTAuth.initialize(_mainAdmin);
    ERC721Upgradeable.__ERC721_init(_name, _symbol);
  }

  function setCreator(uint _tokenId, address _creator) onlyMainAdmin external {
    creators[_tokenId] = _creator;
  }

  function mintLand(uint _id, address _owner) external onlyMintAdmin {
    _mint(_owner, _id);
  }

  function _beforeTokenTransfer(
    address _from,
    address _to,
    uint256 _tokenId
  ) internal override {
    require(_isMintAdmin() || _isTransferAble(), "NFT: no transferable right");
    if (_from == address(0)) {
      totalSupply++;
    } else if (_to == address(0)) {
      totalSupply--;
    }
    _tokenId;
  }
}
