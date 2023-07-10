// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "./libs/fota/Auth.sol";
import "./libs/zeppelin/token/BEP20/IBEP20.sol";

interface IFOTA is IBEP20 {
  function releaseAdvisorAllocation() external;
}

contract Advisor is Auth {

  struct Member {
    uint amount;
    uint startClaimingTime;
    uint endClaimingTime;
    uint lastClaimed;
    uint totalClaimed;
    bool locked;
  }
  mapping(address => Member) public members;
  IFOTA public fotaToken;
  uint private constant SECONDS_PER_YEAR = 29_808_000;

  event MemberSet(address indexed member, uint amount);
  event MemberUpdated(address indexed member, uint amount);
  event MemberLockStatusUpdated(address indexed member, bool status);
  event Claimed(address indexed member, uint amount, uint timestamp);
  event Withdrew(address indexed user, uint amount, uint timestamp);

  function initialize(address _fotaToken) override public initializer {
    Auth.initialize(msg.sender);
    fotaToken = IFOTA(_fotaToken);
  }

  function setupMember(address _member, uint _amount) external onlyMainAdmin {
    require(members[_member].startClaimingTime == 0, "Advisor: member has setup already");
    members[_member] = Member(_amount, block.timestamp, block.timestamp + SECONDS_PER_YEAR, block.timestamp, 0, false);
    emit MemberSet(_member, _amount);
  }

  function updateMember(address _member, uint _amount) external onlyMainAdmin {
    Member storage member = members[_member];
    require(member.startClaimingTime > 0, "Advisor: member not found");
    require(member.lastClaimed == member.startClaimingTime, "Advisor: member has started the claiming");
    member.amount = _amount;
    emit MemberUpdated(_member, _amount);
  }

  function updateMemberLockStatus(address _member, bool _locked) external onlyMainAdmin {
    members[_member].locked = _locked;
    emit MemberLockStatusUpdated(_member, _locked);
  }

  function claim() external {
    Member storage member = members[msg.sender];
    require(member.startClaimingTime > 0, "Advisor: member not found");
    require(!member.locked, "Advisor: member locked");
    uint claimablePerSecond = member.amount / SECONDS_PER_YEAR;
    uint claimableSeconds = block.timestamp < member.endClaimingTime ? block.timestamp - member.lastClaimed : member.endClaimingTime - member.lastClaimed;
    uint claimableAmount = claimablePerSecond * claimableSeconds;
    member.lastClaimed = block.timestamp;
    member.totalClaimed += claimableAmount;
    require(member.totalClaimed <= member.amount, "Advisor: amount invalid");
    fotaToken.releaseAdvisorAllocation();
    require(fotaToken.transfer(msg.sender, claimableAmount), "Advisor: transfer token failed");

    emit Claimed(msg.sender, claimableAmount, block.timestamp);
  }

  function withdraw(address _tokenAddress, uint _amount) external onlyMainAdmin {
    IBEP20 token = IBEP20(_tokenAddress);
    require(_amount <= token.balanceOf(address(this)), "Advisor: amount invalid");
    require(token.transfer(msg.sender, _amount), "Advisor: transfer token failed");

    emit Withdrew(msg.sender, _amount, block.timestamp);
  }

}
