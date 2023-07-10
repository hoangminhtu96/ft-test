// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "./libs/fota/Auth.sol";
import "./libs/fota/StringUtil.sol";

contract Citizen is Auth {
  using StringUtil for string;
  struct Resident {
    uint id;
    string userName;
    address inviter;
  }
  mapping (address => Resident) public residents;
  mapping (address => bool) public whiteList;
  mapping (bytes24 => address) private userNameAddresses;
  uint totalResident;
  address public defaultInviter;

  event Registered(address indexed userAddress, string userName, address indexed inviter, uint timestamp);
  event InviterUpdated(address[] users, address inviter);
  event DefaultInviterUpdated(address indexed inviter);
  event SetWhiteListed(address indexed userAddress, bool status);

  function initialize(address _mainAdmin) override public initializer {
    super.initialize(_mainAdmin);
    defaultInviter = _mainAdmin;
  }

  function register(string calldata _userName, address _inviter) external returns (uint) {
    if (_inviter == address(0)) {
      _inviter = defaultInviter;
    }
    require(isCitizen(_inviter) && msg.sender != _inviter, "Citizen: inviter is invalid");
    require(_userName.validateUserName(), "Citizen: invalid userName");
    Resident storage resident = residents[msg.sender];
    require(!isCitizen(msg.sender), "Citizen: already an citizen");
    bytes24 _userNameAsKey = _userName.toBytes24();
    require(userNameAddresses[_userNameAsKey] == address(0), "Citizen: userName already exist");
    userNameAddresses[_userNameAsKey] = msg.sender;

    totalResident += 1;
    resident.id = totalResident;
    resident.userName = _userName;
    resident.inviter = _inviter;
    emit Registered(msg.sender, _userName, _inviter, block.timestamp);
    return resident.id;
  }

  function isCitizen(address _address) view public returns (bool) {
    if (whiteList[_address]) {
      return true;
    }
    Resident storage resident = residents[_address];
    return resident.id > 0;
  }

  function getInviter(address _address) view public returns (address) {
    Resident storage resident = residents[_address];
    return resident.inviter;
  }

  function setWhiteList(address _address, bool _status) external onlyMainAdmin {
    require(_address != address(0), "Citizen: invalid address");
    whiteList[_address] = _status;
    emit SetWhiteListed(_address, _status);
  }

  function updateInviter(address[] calldata _addresses, address _inviter) external onlyMainAdmin {
    for(uint i = 0; i < _addresses.length; i++) {
      residents[_addresses[i]].inviter = _inviter;
    }
    emit InviterUpdated(_addresses, _inviter);
  }

  function updateDefaultInviter(address _inviter) external onlyMainAdmin {
    require(isCitizen(_inviter), "Citizen: please register first");
    defaultInviter = _inviter;
    emit DefaultInviterUpdated(_inviter);
  }

  function syncResidents(address[] calldata _residents, uint[] calldata _ids, string[] calldata _userNames, address[] calldata _inviters) external onlyContractAdmin {
    require(_residents.length == _ids.length && _ids.length == _userNames.length && _inviters.length == _inviters.length, "Citizen: data length invalid");
    totalResident += _residents.length;
    Resident storage resident;
    for(uint i = 0; i < _residents.length; i++) {
      resident = residents[_residents[i]];
      resident.id = _ids[i];
      resident.userName = _userNames[i];
      resident.inviter = _inviters[i];
    }
  }
}
