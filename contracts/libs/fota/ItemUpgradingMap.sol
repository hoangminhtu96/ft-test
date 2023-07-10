// SPDX-License-Identifier: GPL

pragma solidity 0.8.0;

import "./Auth.sol";

contract ItemUpgradingMap is Auth {
  struct Item {
    uint16[] materials;
    uint fee;
    uint8 successRatio;
  }
  mapping (uint16 => Item) public items;
  mapping (uint8 => uint16[]) public itemClasses;

  event ItemSet(
    uint16 _itemClass,
    uint16[] _materials,
    uint _fee,
    uint _successRatio
  );

  event ItemUpdated(
    uint16 _itemClass,
    uint16[] _materials,
    uint _fee,
    uint _successRatio
  );

  event FeeUpdated(uint8 _gene, uint _fee, uint timestamp);
  event RatioUpdated(uint16 _classId, uint8 _successRatio, uint timestamp);

  function initialize(
    address _mainAdmin
  ) public override initializer {
    mainAdmin = _mainAdmin;
    _initRareItems();
    _initEpicItems();
    _initLegendaryItems();
  }

  function _initRareItems() private {
    uint8 rareRatio = 50;
    uint rareFee = 500e6;
    itemClasses[2].push(201);
    items[201] = Item(new uint16[](0), rareFee, rareRatio);
    items[201].materials.push(105);
    itemClasses[2].push(202);
    items[202] = Item(new uint16[](0), rareFee, rareRatio);
    items[202].materials.push(106);
    itemClasses[2].push(203);
    items[203] = Item(new uint16[](0), rareFee, rareRatio);
    items[203].materials.push(111);
    itemClasses[2].push(204);
    items[204] = Item(new uint16[](0), rareFee, rareRatio);
    items[204].materials.push(115);
    itemClasses[2].push(205);
    items[205] = Item(new uint16[](0), rareFee, rareRatio);
    items[205].materials.push(110);
    itemClasses[2].push(206);
    items[206] = Item(new uint16[](0), rareFee, rareRatio);
    items[206].materials.push(116);
    itemClasses[2].push(207);
    items[207] = Item(new uint16[](0), rareFee, rareRatio);
    items[207].materials.push(104);
    itemClasses[2].push(208);
    items[208] = Item(new uint16[](0), rareFee, rareRatio);
    items[208].materials.push(117);
    itemClasses[2].push(209);
    items[209] = Item(new uint16[](0), rareFee, rareRatio);
    items[209].materials.push(121);
    items[209].materials.push(122);
    itemClasses[2].push(210);
    items[210] = Item(new uint16[](0), rareFee, rareRatio);
    items[210].materials.push(101);
    items[210].materials.push(102);
    itemClasses[2].push(211);
    items[211] = Item(new uint16[](0), rareFee, rareRatio);
    items[211].materials.push(103);
    items[211].materials.push(104);
    itemClasses[2].push(212);
    items[212] = Item(new uint16[](0), rareFee, rareRatio);
    items[212].materials.push(107);
    items[212].materials.push(108);
    itemClasses[2].push(213);
    items[213] = Item(new uint16[](0), rareFee, rareRatio);
    items[213].materials.push(109);
    items[213].materials.push(110);
    itemClasses[2].push(214);
    items[214] = Item(new uint16[](0), rareFee, rareRatio);
    items[214].materials.push(112);
    items[214].materials.push(113);
    itemClasses[2].push(215);
    items[215] = Item(new uint16[](0), rareFee, rareRatio);
    items[215].materials.push(110);
    items[215].materials.push(114);
    itemClasses[2].push(216);
    items[216] = Item(new uint16[](0), rareFee, rareRatio);
    items[216].materials.push(118);
    items[216].materials.push(119);
    itemClasses[2].push(217);
    items[217] = Item(new uint16[](0), rareFee, rareRatio);
    items[217].materials.push(110);
    items[217].materials.push(120);
    itemClasses[2].push(218);
    items[218] = Item(new uint16[](0), rareFee, rareRatio);
    items[218].materials.push(110);
    items[218].materials.push(119);
  }

  function _initEpicItems() private {
    uint8 epicRatioNoUpgradable = 10;
    uint8 epicRatioUpgradable = 30;
    uint epicFee = 1000e6;
    itemClasses[3].push(301);
    items[301] = Item(new uint16[](0), epicFee, epicRatioUpgradable);
    items[301].materials.push(215);
    itemClasses[3].push(302);
    items[302] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[302].materials.push(218);
    itemClasses[3].push(303);
    items[303] = Item(new uint16[](0), epicFee, epicRatioUpgradable);
    items[303].materials.push(210);
    itemClasses[3].push(304);
    items[304] = Item(new uint16[](0), epicFee, epicRatioUpgradable);
    items[304].materials.push(211);
    itemClasses[3].push(305);
    items[305] = Item(new uint16[](0), epicFee, epicRatioUpgradable);
    items[305].materials.push(212);
    itemClasses[3].push(306);
    items[306] = Item(new uint16[](0), epicFee, epicRatioUpgradable);
    items[306].materials.push(202);
    itemClasses[3].push(308);
    items[308] = Item(new uint16[](0), epicFee, epicRatioUpgradable);
    items[308].materials.push(201);
    items[308].materials.push(202);
    itemClasses[3].push(307);
    items[307] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[307].materials.push(213);
    itemClasses[3].push(309);
    items[309] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[309].materials.push(202);
    items[309].materials.push(210);
    itemClasses[3].push(310);
    items[310] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[310].materials.push(110);
    items[310].materials.push(206);
    itemClasses[3].push(311);
    items[311] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[311].materials.push(110);
    items[311].materials.push(207);
    itemClasses[3].push(312);
    items[312] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[312].materials.push(116);
    items[312].materials.push(208);
    itemClasses[3].push(313);
    items[313] = Item(new uint16[](0), epicFee, epicRatioNoUpgradable);
    items[313].materials.push(201);
  }

  function _initLegendaryItems() private {
    uint8 legendaryRatio = 10;
    uint legendaryFee = 5000e6;
    itemClasses[4].push(401);
    items[401] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[401].materials.push(306);
    itemClasses[4].push(402);
    items[402] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[402].materials.push(301);
    itemClasses[4].push(403);
    items[403] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[403].materials.push(304);
    itemClasses[4].push(404);
    items[404] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[404].materials.push(104);
    items[404].materials.push(308);
    itemClasses[4].push(405);
    items[405] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[405].materials.push(212);
    items[405].materials.push(301);
    itemClasses[4].push(406);
    items[406] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[406].materials.push(204);
    items[406].materials.push(301);
    itemClasses[4].push(407);
    items[407] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[407].materials.push(216);
    items[407].materials.push(301);
    itemClasses[4].push(408);
    items[408] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[408].materials.push(205);
    items[408].materials.push(301);
    itemClasses[4].push(409);
    items[409] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[409].materials.push(203);
    items[409].materials.push(308);
    itemClasses[4].push(410);
    items[410] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[410].materials.push(211);
    items[410].materials.push(303);
    itemClasses[4].push(411);
    items[411] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[411].materials.push(210);
    items[411].materials.push(308);
    itemClasses[4].push(412);
    items[412] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[412].materials.push(201);
    items[412].materials.push(305);
    itemClasses[4].push(413);
    items[413] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[413].materials.push(213);
    items[413].materials.push(308);
    itemClasses[4].push(414);
    items[414] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[414].materials.push(211);
    items[414].materials.push(308);
    itemClasses[4].push(415);
    items[415] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[415].materials.push(214);
    items[415].materials.push(308);
    itemClasses[4].push(416);
    items[416] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[416].materials.push(113);
    items[416].materials.push(308);
    itemClasses[4].push(417);
    items[417] = Item(new uint16[](0), legendaryFee, legendaryRatio);
    items[417].materials.push(217);
    items[417].materials.push(308);
  }

  function getItem(uint16 _itemClass) external view returns(uint16[] memory, uint, uint8) {
    Item memory item = items[_itemClass];
    return (
      item.materials,
      item.fee,
      item.successRatio
    );
  }

  function setItem(uint8 _gene, uint16 _itemClass, uint16[] calldata _materials, uint _fee, uint8 _successRatio) onlyMainAdmin external {
    _validateClass(_itemClass);
    require(items[_itemClass].fee == 0, "Item Upgrading: item exists");
    _validateRatio(_successRatio);
    items[_itemClass] = Item(_materials, _fee, _successRatio);
    itemClasses[_gene].push(_itemClass);
    emit ItemSet(_itemClass, _materials, _fee, _successRatio);
  }

  function updateItem(uint16 _itemClass, uint16[] calldata _materials, uint _fee, uint8 _successRatio) onlyMainAdmin external {
    _validateClass(_itemClass);
    require(items[_itemClass].fee > 0, "Item Upgrading: item not exists");
    _validateRatio(_successRatio);
    items[_itemClass] = Item(_materials, _fee, _successRatio);
    emit ItemUpdated(_itemClass, _materials, _fee, _successRatio);
  }

  function updateFee(uint8 _gene, uint _fee) onlyMainAdmin external {
    _validateGene(_gene);
    for(uint i = 0; i < itemClasses[_gene].length; i++) {
      items[itemClasses[_gene][i]].fee = _fee;
    }
    emit FeeUpdated(_gene, _fee, block.timestamp);
  }

  function updateRatio(uint16 _classId, uint8 _successRatio) onlyMainAdmin external {
    _validateRatio(_successRatio);
    items[_classId].successRatio = _successRatio;
    emit RatioUpdated(_classId, _successRatio, block.timestamp);
  }

  function _validateGene(uint8 _gene) private view {
    require(_gene > 1 && itemClasses[_gene].length > 0, "Item Upgrading: invalid gene");
  }

  function _validateClass(uint16 _itemClass) private pure {
    require(_itemClass >= 200, "Item Upgrading: invalid class");
  }

  function _validateRatio(uint8 _successRatio) private pure {
    require(_successRatio < 100, "Item Upgrading: invalid ratio");
  }
}
