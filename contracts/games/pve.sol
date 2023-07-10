// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "../libs/fota/Auth.sol";
import "../libs/fota/Math.sol";
import "../interfaces/IEnergyManager.sol";
import "../interfaces/IRewardManager.sol";
import "../interfaces/IGameNFT.sol";
import "../interfaces/IPVP.sol";
import "../interfaces/IMarketPlace.sol";
import "../interfaces/ILandLordManager.sol";
import "../interfaces/IFOTAPricer.sol";
import "../interfaces/IMarketPlaceV2.sol";

contract FOTAGamePVE is Auth, EIP712Upgradeable {
  using Math for uint;
  struct Mission {
    uint id;
    uint mainReward;
    uint subReward;
    uint32 experience;
  }
  IEnergyManager public energyManager;
  IRewardManager public rewardManager;
  IMarketPlace public marketPlace;
  IGameNFT public heroNft;
  IGameNFT public itemNft;

  uint public totalMissions;
  uint public finishGameTimeOut;
  mapping (uint => uint) public energyConsumptions;
  mapping (address => uint) public nonces;
  mapping (address => uint) public biggestFinishMission;
  mapping (uint => Mission) public missions;
  mapping (address => uint) public totalWinInDay;
  IFOTAPricer public fotaPricer;
  mapping (address => mapping(uint => bool)) public firstConsumeInDay;
  IMarketPlaceV2 public marketPlaceV2;

  event MissionAdded(uint id, uint mainReward, uint subReward, uint32 experience, uint timestamp);
  event MissionUpdated(uint id, uint mainReward, uint subReward, uint32 experience, uint timestamp);
  event EnergyConsumptionUpdated(uint mission, uint energyConsumptions);
  event FinishGameTimeOutUpdated(uint timeOut);
  event GameDataSynced(address indexed user, uint[] heroIds, bytes signature);

  function initialize(
    string memory _name,
    string memory _version,
    address _mainAdmin,
    address _energyManager,
    address _rewardManager,
    address _heroNft,
    address _itemNft,
    address _marketPlace
  ) public initializer {
    Auth.initialize(_mainAdmin);
    EIP712Upgradeable.__EIP712_init(_name, _version);
    energyManager = IEnergyManager(_energyManager);
    rewardManager = IRewardManager(_rewardManager);
    marketPlace = IMarketPlace(_marketPlace);
    heroNft = IGameNFT(_heroNft);
    itemNft = IGameNFT(_itemNft);
//    _initData();
  }
  // _heroData: 0: heroId, 1: energy, 2: profit, 3: renting order, 4: renting order token receiver
  // _data: 0: userReward, 1: prestigeShard, 2: referralReward, 3: farmShare, 4: biggestFinishMission, 5: timestamp, 6->n: landLord
  function syncData(uint[][5] memory _heroData, uint32[] memory _experiences, uint[] memory _data, bytes memory _signature, uint16[] calldata _revokedHeroes, int pvpGem) external {
    uint totalValue = energyManager.updateEnergy(_heroData[0], _heroData[1]);
    heroNft.experienceUp(_heroData[0], _experiences);
    heroNft.increaseTotalProfited(_heroData[0], _heroData[2]);
    _validateSignature(totalValue, _data[5], _signature);
    rewardManager.addPVEReward(msg.sender, _data);
    rewardManager.addPVPReward(msg.sender, pvpGem);
    if (_data[4] > biggestFinishMission[msg.sender]) {
      biggestFinishMission[msg.sender] = _data[4];
    }
    if (_revokedHeroes.length > 0) {
      marketPlaceV2.revokeHeroes(_revokedHeroes);
    }
    // revoke renting
    if (_heroData[3].length > 0) {
      marketPlaceV2.revokeOrders(_heroData[3], _heroData[4]);
    }

    emit GameDataSynced(msg.sender, _heroData[0], _signature);
  }

  // PRIVATE FUNCTIONS

  function _validateSignature(uint _totalValue, uint _timestamp, bytes memory _signature) private {
    require(_timestamp + finishGameTimeOut >= block.timestamp, "PVE: signature time out");
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
        keccak256("SyncData(address user,uint256 nonce,uint256 totalValue,uint256 timestamp)"),
        msg.sender,
        nonces[msg.sender],
        _totalValue,
        _timestamp
      )));
    nonces[msg.sender]++;
    address signer = ECDSAUpgradeable.recover(digest, _signature);
    require(signer == contractAdmin, "MessageVerifier: invalid signature");
    require(signer != address(0), "ECDSAUpgradeable: invalid signature");
  }

  function _initData() private {
    totalMissions = 30;
    finishGameTimeOut = 600;
    for(uint i = 1; i <= totalMissions; i++) {
      missions[i] = Mission(i, i * 1e6, i * 1e6 / 2, uint32(i));
      energyConsumptions[i] = i * 3;
    }
  }

  // ADMIN FUNCTIONS

  function addMission(uint _mainReward, uint _subReward, uint32 _experience) external onlyMainAdmin {
    totalMissions++;
    missions[totalMissions] = Mission(totalMissions, _mainReward, _subReward, _experience);
    emit MissionAdded(totalMissions, _mainReward, _subReward, _experience, block.timestamp);
  }

  function updateMission(uint _id, uint _mainReward, uint _subReward, uint32 _experience) external onlyMainAdmin {
    missions[_id].mainReward = _mainReward;
    missions[_id].subReward = _subReward;
    missions[_id].experience = _experience;
    emit MissionUpdated(_id, _mainReward, _subReward, _experience, block.timestamp);
  }

  function updateEnergyConsumption(uint _mission, uint _energyConsumption) external onlyMainAdmin {
    energyConsumptions[_mission] = _energyConsumption;
    emit EnergyConsumptionUpdated(_mission, _energyConsumption);
  }

  function updateFinishGameTimeout(uint _timeOut) external onlyMainAdmin {
    finishGameTimeOut = _timeOut;
    emit FinishGameTimeOutUpdated(_timeOut);
  }

  function setContracts(address _heroNft, address _itemNft, address _energyManager, address _rewardManager, address _marketPlace, address _marketPlaceV2) external onlyMainAdmin {
    require(_heroNft != address(0) && _itemNft != address(0), "401");
    heroNft = IGameNFT(_heroNft);
    itemNft = IGameNFT(_itemNft);
    energyManager = IEnergyManager(_energyManager);
    rewardManager = IRewardManager(_rewardManager);
    marketPlace = IMarketPlace(_marketPlace);
    marketPlaceV2 = IMarketPlaceV2(_marketPlaceV2);
  }
}

