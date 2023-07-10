// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./BaseNFT.sol";
import "../libs/fota/ArrayUtil.sol";
import "../libs/fota/StringUtil.sol";
import "../interfaces/IEnergyManager.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IFOTAPricer.sol";
import "../interfaces/IMarketPlace.sol";

contract HeroNFT is BaseNFT {
  using StringUtil for string;
  using ArrayUtil for uint[];

  struct Hero {
    uint16 id;
    uint createdAt;
    uint8 level;
    uint32 experience;
    uint ownPrice;
    uint failedUpgradingAmount;
    uint[3] skills;
    uint totalProfited;
  }

  mapping (uint => Hero) public heroes;
  mapping (bytes24 => bool) private heroNames;
  mapping (uint16 => string) public mappingHeroRace;
  mapping (uint16 => string) public mappingHeroClass;
  mapping (uint16 => string) public mappingHeroName;
  mapping (uint16 => uint[7]) private strengthIndexReferences;
  mapping (uint16 => uint[7]) private strengthBonuses;
  mapping (uint8 => uint32) public experienceCheckpoint;

  uint16 public countId;
  IEnergyManager public energyManager;
  uint public totalSupply;
  uint public profitRate;
  mapping (address => uint[]) private ownerHeroes;
  mapping (address => bool) exclusives;
  IMarketPlace public marketPlace;
  mapping (uint => uint) public fotaOwnPrices;
  mapping (uint => uint) public heroTotalProfitedInFota;
  IFOTAPricer public fotaPricer;
  uint public fotaProfitRate;
  mapping (uint => bool) public lockedFromMKP;

  event NewClassAdded(
    uint16 classId,
    string klass,
    uint[7] strengths
  );
  event LevelUp(
    uint tokenId,
    uint level,
    uint nextLevelCheckpoint
  );
  event ExperienceUp(
    uint tokenId,
    uint32 experience
  );
  event ExperienceCheckpointUpdated(
    uint16 level,
    uint32 experience
  );
  event BaseStrengthUpdated(
    uint16 classId,
    uint[7] baseStrength
  );
  event StrengthBonusUpdated(
    uint16 classId,
    uint[7] strengthBonus
  );
  event SkillUp(
    uint tokenId,
    uint[3] level
  );
  event HeroRaceUpdated(
    uint16 classId,
    string race
  );
  event HeroClassUpdated(
    uint16 classId,
    string klass
  );
  event HeroNameUpdated(
    uint16 classId,
    string name
  );
  event HeroInfoUpdated(
    uint tokenId,
    uint8 level,
    uint32 experience,
    uint[3] skills
  );
  event TotalProfitedUpdated(
    uint tokenId,
    uint totalProfited
  );
  event ProfitRateUpdated(
    uint profitRate
  );
  event LockedFromMKPStatusUpdated(
    uint[] tokenIds,
    bool locked
  );

  function initialize(
    address _mainAdmin,
    string calldata _name,
    string calldata _symbol
  ) override public initializer {
    BaseNFT.initialize(_mainAdmin, _name, _symbol);
  }

  function mintHero(address _owner, uint16 _classId, uint _price, uint _index) onlyMintAdmin public returns (uint) {
    return _mint(_owner, _classId, _price, _index);
  }

  function mintHeroes(address _owner, uint16 _classId, uint _price, uint _quantity) onlyMintAdmin external {
    for(uint i = 0; i < _quantity; i++) {
      _mint(_owner, _classId, _price, i);
    }
  }

  function mintUserHeroes(address[] calldata _owners, uint16[] calldata _classIds, uint[] calldata _price) onlyMintAdmin external {
    for(uint i = 0; i < _owners.length; i++) {
      address owner = _owners[i];
      uint16 classId = _classIds[i];
      uint price = _price[i];
    _mint(owner, classId, price, i);
    }
  }

  function airdrop(address _owner, uint16 _classId, uint _price, uint _quantity) onlyMainAdmin external returns (uint[] memory) {
    uint[] memory ids = new uint[](_quantity);
    for(uint i = 0; i < _quantity; i++) {
      ids[i] = _mint(_owner, _classId, _price, i);
      lockedFromMKP[ids[i]] = true;
    }
    emit LockedFromMKPStatusUpdated(ids, true);
    return ids;
  }

  function getHero(uint _tokenId) external view returns (string memory, string memory, string memory, uint16, uint, uint8, uint32) {
    return (
      mappingHeroRace[heroes[_tokenId].id],
      mappingHeroClass[heroes[_tokenId].id],
      mappingHeroName[heroes[_tokenId].id],
      heroes[_tokenId].id,
      heroes[_tokenId].createdAt,
      heroes[_tokenId].level,
      heroes[_tokenId].experience
    );
  }

  function getHeroSkills(uint _tokenId) external view returns (uint, uint, uint) {
    return (
      heroes[_tokenId].skills[0],
      heroes[_tokenId].skills[1],
      heroes[_tokenId].skills[2]
    );
  }

  function getClassId(uint _tokenId) external view returns (uint16) {
    return heroes[_tokenId].id;
  }

  function getCreator(uint _tokenId) override external view returns (address) {
    return creators[heroes[_tokenId].id];
  }

  function getStrengthIndexReferences(uint16 _classId) external view returns (uint, uint, uint, uint, uint, uint, uint) {
    return (
      strengthIndexReferences[_classId][0],
      strengthIndexReferences[_classId][1],
      strengthIndexReferences[_classId][2],
      strengthIndexReferences[_classId][3],
      strengthIndexReferences[_classId][4],
      strengthIndexReferences[_classId][5],
      strengthIndexReferences[_classId][6]
    );
  }

  function getStrengthBonuses(uint16 _classId) external view returns (uint, uint, uint, uint, uint, uint, uint) {
    return (
      strengthBonuses[_classId][0],
      strengthBonuses[_classId][1],
      strengthBonuses[_classId][2],
      strengthBonuses[_classId][3],
      strengthBonuses[_classId][4],
      strengthBonuses[_classId][5],
      strengthBonuses[_classId][6]
    );
  }

  function reachMaxProfit(uint _tokenId) public view returns (bool) {
    require(_exists(_tokenId), "Hero not found");
    Hero storage hero = heroes[_tokenId];
    return hero.totalProfited >= _getMaxProfitable(_tokenId);
  }

  function _beforeTokenTransfer(
    address _from,
    address _to,
    uint256 _tokenId
  ) internal override {
    super._beforeTokenTransfer(_from, _to, _tokenId);
    if (_to == address(0)) {
      delete heroes[_tokenId];
      totalSupply--;
    } else {
      if (!exclusives[_to]) {
        ownerHeroes[_to].push(_tokenId);
      }
    }
    if (_from == address(0)) {
      totalSupply++;
    } else if (!exclusives[_from]) {
      ownerHeroes[_from].removeElementFromArray(_tokenId);
    }
  }

  // PRIVATE FUNCTIONS

  function _mint(address _owner, uint16 _classId, uint _price, uint _index) private returns (uint) {
    require(_classId >= 1 && _classId <= countId, 'NFT: Invalid class');
    uint newId = _genNewId(_index);
    _mint(_owner, newId);
    heroes[newId].id = _classId;
    heroes[newId].level = 1;
    heroes[newId].createdAt = block.timestamp;
    heroes[newId].ownPrice = _price;
    heroes[newId].skills = [1, 0, 0];
    return newId;
  }

  function _levelUp(uint _tokenId, uint steps) private {
    heroes[_tokenId].level += uint8(steps);
    emit LevelUp(_tokenId, heroes[_tokenId].level, experienceCheckpoint[heroes[_tokenId].level + 1]);
  }

  function getOwnerHeroes(address _owner) external view returns(uint[] memory) {
    return ownerHeroes[_owner];
  }

  function getOwnerTotalHeroThatNotReachMaxProfit(address _owner) external view returns(uint) {
    uint totalHero;
    uint[] memory ids = ownerHeroes[_owner];
    for(uint i = 0; i < ids.length; i++) {
      if (!reachMaxProfit(ids[i])) {
        totalHero += 1;
      }
    }
    return totalHero;
  }

  function tokenURI(uint _tokenId) public view override returns (string memory) {
    require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
    uint16 classId = heroes[_tokenId].id;
    string memory classIdStr = Strings.toString(classId);
    string memory domain = block.chainid == 56 ? 'https://marketplace.fota.io' : 'https://dev-marketplace.fota.io';

    return string(abi.encodePacked(domain, '/metadata/heroes/', classIdStr, '.json'));
  }

  // ADMIN FUNCTIONS

  function updateBaseStrengths(uint16 _classId, uint[7] calldata _strengths) external onlyMainAdmin {
    strengthIndexReferences[_classId] = _strengths;
    emit BaseStrengthUpdated(_classId, _strengths);
  }

  function updateStrengthBonus(uint16 _classId, uint[7] calldata _strengthBonuses) external onlyMainAdmin {
    strengthBonuses[_classId] = _strengthBonuses;
    emit StrengthBonusUpdated(_classId, _strengthBonuses);
  }

  function updateExperienceCheckpoint(uint8 _level, uint32 _experience) external onlyMainAdmin {
    experienceCheckpoint[_level] = _experience;
    emit ExperienceCheckpointUpdated(_level, _experience);
  }

  function updateOwnPrice(uint _tokenId, uint _ownPrice) override onlyMintAdmin external {
    Hero storage hero = heroes[_tokenId];
    hero.ownPrice = _ownPrice;
    emit OwnPriceUpdated(_tokenId, _ownPrice);
  }

  function increaseTotalProfited(uint[] memory _tokenIds, uint[] memory _amounts) onlyMintAdmin external {
    for (uint i = 0; i < _tokenIds.length; i++) {
      Hero storage hero = heroes[_tokenIds[i]];
      uint maxProfitable = _getMaxProfitable(_tokenIds[i]);

      if (hero.totalProfited + _amounts[i] >= maxProfitable) {
        hero.totalProfited = maxProfitable;
      } else {
        hero.totalProfited += _amounts[i];
      }
      emit TotalProfitedUpdated(_tokenIds[i], hero.totalProfited);
    }
  }

  function updateProfitRate(uint _profitRate) onlyMainAdmin external {
    profitRate = _profitRate;
    emit ProfitRateUpdated(_profitRate);
  }

  function experienceUp(uint[] memory _tokenIds, uint32[] memory _experiences) external onlyGameContract {
    for (uint i = 0; i < _tokenIds.length; i++) {
      for (uint j = 26; j > heroes[_tokenIds[i]].level; j--) {
        if (heroes[_tokenIds[i]].experience + _experiences[i] >= experienceCheckpoint[uint8(j)]) {
          _levelUp(_tokenIds[i], j - heroes[_tokenIds[i]].level);

          // skills
          uint8 levelMod5 = uint8(heroes[_tokenIds[i]].level % 5);
          if (levelMod5 != 2 && levelMod5 != 4) {
            uint8 levelDiv5 = uint8(heroes[_tokenIds[i]].level / 5);
            if (levelMod5 == 0) {
              heroes[_tokenIds[i]].skills = [levelDiv5, levelDiv5, levelDiv5];
            } else if (levelMod5 == 1) {
              heroes[_tokenIds[i]].skills = [levelDiv5 + 1, levelDiv5, levelDiv5];
            } else {
              heroes[_tokenIds[i]].skills = [levelDiv5 + 1, levelDiv5 + 1, levelDiv5];
            }
            emit SkillUp(_tokenIds[i],heroes[_tokenIds[i]].skills);
          }
        }
      }
      heroes[_tokenIds[i]].experience += _experiences[i];
      emit ExperienceUp(_tokenIds[i], heroes[_tokenIds[i]].experience);
    }
  }

  function addHeroClass(string calldata _race, string calldata _class, string calldata _name, uint[7] calldata _strengths, address _creator) external onlyMainAdmin {
    require(!heroNames[_name.toBytes24()], "Name exists");
    heroNames[_name.toBytes24()] = true;
    countId += 1;

    mappingHeroRace[countId] = _race;
    mappingHeroClass[countId] = _class;
    mappingHeroName[countId] = _name;
    strengthIndexReferences[countId] = _strengths;
    creators[countId] = _creator;
    emit NewClassAdded(countId, _class, _strengths);
  }

  function updateHeroRace(uint16 _classId, string calldata _race) external onlyMainAdmin {
    mappingHeroRace[_classId] = _race;
    emit HeroRaceUpdated(_classId, _race);
  }

  function updateHeroClass(uint16 _classId, string calldata _class) external onlyMainAdmin {
    mappingHeroClass[_classId] = _class;
    emit HeroClassUpdated(_classId, _class);
  }

  function updateHeroName(uint16 _classId, string calldata _name) external onlyMainAdmin {
    require(!heroNames[_name.toBytes24()], "Name exists");
    heroNames[mappingHeroName[_classId].toBytes24()] = false;
    heroNames[_name.toBytes24()] = true;
    mappingHeroName[_classId] = _name;
    emit HeroNameUpdated(_classId, _name);
  }

  function updateHeroInfo(uint _tokenId, uint8 _level, uint32 _experience, uint[3] calldata _skills) external onlyMintAdmin {
    require(_level > 0, "400");
    heroes[_tokenId].level = _level;
    heroes[_tokenId].experience = _experience;
    heroes[_tokenId].skills = _skills;
    emit HeroInfoUpdated(_tokenId, _level, _experience, _skills);
  }

  function updateExclusive(address _address, bool _status) external onlyMainAdmin {
    exclusives[_address] = _status;
  }

  function setFOTAPricer(address _fotaPricer) external onlyMainAdmin {
    fotaPricer = IFOTAPricer(_fotaPricer);
  }

  function updateLockedFromMKPStatus(uint[] calldata _tokenIds, bool _status) external onlyMintAdmin {
    for(uint i = 0; i < _tokenIds.length; i++) {
      lockedFromMKP[_tokenIds[i]] = _status;
    }
    emit LockedFromMKPStatusUpdated(_tokenIds, _status);
  }

  // PRIVATE FUNCTIONS

  function _getMaxProfitable(uint _tokenId) private view returns (uint) {
    Hero storage hero = heroes[_tokenId];
    return hero.ownPrice * profitRate / 100;
  }
}
