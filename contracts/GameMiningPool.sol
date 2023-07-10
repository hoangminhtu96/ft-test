// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "./libs/fota/Auth.sol";
import "./libs/zeppelin/token/BEP20/IBEP20.sol";

contract GameMiningPool is Auth {

  mapping (address => bool) public gameAddresses;
  IBEP20 public fotaToken;

  modifier onlyGameContract() {
    require(gameAddresses[msg.sender], "GameMiningPool: invalid caller");
    _;
  }

  function initialize(
    address _mainAdmin
  ) override public initializer {
    Auth.initialize(_mainAdmin);
    fotaToken = IBEP20(0x0A4E1BdFA75292A98C15870AeF24bd94BFFe0Bd4);
  }

  function setGameAddress(address _gameAddress, bool _status) external onlyMainAdmin {
    require(_gameAddress != address(0), "GameMiningPool: game address is the zero address");
    gameAddresses[_gameAddress] = _status;
  }

  function releaseGameAllocation(address _gamerAddress, uint _amount) external onlyGameContract returns (bool) {
    require(fotaToken.balanceOf(address(this)) >= _amount, "GameMiningPool: pool is insufficient balance");
    fotaToken.transfer(_gamerAddress, _amount);
    return true;
  }

  function setContracts(address _fota) external onlyMainAdmin {
    require(_fota != address(0), "Invalid address");
    fotaToken = IBEP20(_fota);
  }
}
