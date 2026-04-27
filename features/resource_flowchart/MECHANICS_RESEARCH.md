# AoE4 Mechanics Research (Comprehensive Pass, 1v1-Relevant)

Last updated: 2026-04-24 (America/Los_Angeles)

## Scope

This pass was broad, not example-driven.

Data scanned:
1. `https://data.aoe4world.com/units/all.json` (981 entries)
2. `https://data.aoe4world.com/buildings/all.json` (635 entries)
3. `https://data.aoe4world.com/technologies/all.json` (1688 entries)

Total entities scanned: 3304

Civilization tags observed in the data:
`ab ay by ch de en fr gol hl hr ja je kt ma mac mo od ot ru sen tug zx`

Method:
1. Consolidated all entities into a single TSV for text and class scanning.
2. Ran category queries over descriptions/classes to identify mechanics families.
3. Verified key mechanics with direct record inspection (Ottoman, Jeanne, defenses, trade, relic/sacred-site interactions, auras/influence).
4. Cross-checked general victory-condition framing against official AoE support docs.

Important note:
Category counts below are lexical hits (mechanics discovery), not fully de-duplicated design primitives.

## Mechanics Taxonomy (Cross-Civ)

1. Free unit production / passive spawns:
34 hits
Examples include Military School, Khaganate Palace random armies, Golden Horn Tower free mercenaries, free-call-in style landmarks.

2. Cost reduction / discount mechanics:
26 hits
Includes civ and landmark discounts for units, villagers, technologies, age-up costs, and building/economy costs.

3. Production speed / throughput modifiers:
39 hits
Includes global production-speed tech, influence-based speed boosts, scholar-garrison acceleration, and batch/queue throughput effects.

4. Passive resource generation / trickles:
108 hits
Includes tax systems, resource landmarks, relic-based generation variants, and periodic generation systems.

5. Trade economy mechanics:
125 hits
Includes standard trader/trade-ship loops plus civ-specific trade modifiers, contracts, toll/outpost trade taxing, and route effects.

6. Aura / influence systems:
50 hits
Includes buff auras, influence regions, network effects, and nearby-production modifiers.

7. Defensive structure and emplacement power:
301 hits
Includes keeps/outposts/towers, emplacement technologies, fortification upgrades, and anti-push defensive scaling.

8. Religious / conversion / sacred-site systems:
126 hits
Includes monks/priests/scholars/imams/dervishes, relic deposit effects, conversions, sacred-site capture, and religion-linked economies.

9. Stealth / detection interactions:
110 hits
Includes stealth-capable units and detection counters (scouts, outposts, town centers, civ-specific detection contexts).

10. Counter-role combat semantics:
661 hits
Description text repeatedly encodes unit role and counter relationships (anti-cavalry, anti-heavy, ranged punish, etc.).

## High-Impact Examples Beyond Ottoman + Jeanne

1. Free value injection families:
Mongol Khaganate random army spawns, English/House of Lancaster free call-ins, multiple landmark-triggered free units.

2. Passive economy alternatives:
Tax-based civ loops, relic variants that generate non-gold yields, map-object influenced generation.

3. Trade as military-enabler:
Trade modifiers and trade-tax structures create sustained gold throughput that changes unit-value conversion windows.

4. Defensive fight distortion:
Outpost/keep/tower upgrades and emplacements materially shift outcomes in local fights without changing nominal fielded unit counts.

5. Aura/influence compounding:
Production, research, damage, speed, and gather auras can change both timing and engagement strength, even with similar unit counts.

## Core Global Game Mechanics (General AoE4)

1. Standard victory modes include Landmark, Sacred Site, and Wonder tracks (official AoE support references these in standard settings).
2. In ranked 1v1 datasets, surrender is common as terminal outcome; this means many matches end before formal alternative win-condition timers conclude.
3. Practical 1v1 causal modeling must therefore include:
economy conversion, tempo and timing, composition and upgrades, positional/defensive context, and pressure-to-surrender.

## Implications for the Analyzer

1. A single “resources in vs units out” metric is necessary but insufficient.
2. We need layered causal accounting:
`Economic Capacity -> Conversion Efficiency -> Fielded Combat Value -> Context Modifiers -> Outcome Pressure`
3. Context modifiers must explicitly include:
discounts/free spawns, upgrades/age timing, counters, static defenses, auras/influence, trade/relic/sacred-site economy.
4. Explanations should be confidence-scored:
directly observed vs inferred from proxies.

## Confidence and Gaps

High confidence:
1. Mechanic presence and text-level semantics from AoE4World game-file data.
2. Broad mechanics coverage across all civ tags.

Medium confidence:
1. Exact in-match activation windows when only indirect timeline evidence exists.
2. Positional claims (fighting under defense) without coordinate telemetry.

Lower confidence areas (current data limits):
1. Micro quality (formation control, pathing, focus fire precision).
2. Exact garrison occupancy timing unless inferable from secondary events.

## Sources

1. AoE4World static data docs:
https://data.aoe4world.com/

2. AoE4World static datasets:
https://data.aoe4world.com/units/all.json
https://data.aoe4world.com/buildings/all.json
https://data.aoe4world.com/technologies/all.json

3. Official AoE support (victory-condition context):
https://support.ageofempires.com/hc/en-us/articles/11393047456020-Using-Random-Map-Generation


## 6) Explorer Civ Dataset (All Civs)

Source: AoE4World Explorer civ data bundle loaded by explorer app.
Snapshot asset: `https://static.aoe4world.com/vite/assets/components-aa8495ba.js`
Coverage: 22 civ entries from Explorer (`/explorer/civs/*`).

Civilizations covered:
`ab` `ay` `by` `ch` `de` `en` `fr` `gol` `hl` `hr` `ja` `je` `kt` `ma` `mac` `mo` `od` `ot` `ru` `sen` `tug` `zx`

### ab - Abbasid Dynasty

Classes: Technology, Camels, City Planning
Techtree root node count: 25
Overview entries:
1. Civilization Bonuses: Research unique technologies that benefit Camels, Military, Religion, Economy, and Trade. | Camel units reduce damage by -20% to nearby enemy horse cavalry. | Mills constructed near Berry Bushes create Orchards, increasing Food capacity by +100. | Gather from Berry Bushes +25% faster but cannot gather from Boar. | Berry carry capacity increased +3. | Land Traders are -33% cheaper. | Docks are -50% cheaper. | Age up without the need for Villagers by upgrading wings on the House of Wisdom. | Enter a Golden Age by constructing buildings in the House of Wisdoms influence, increasing resource gather rate, research times, and production speed.
2. Pursuit of Knowledge: Embrace the Abbasids' pursuit of knowledge through researching unique technologies that benefit Camels, Military, Religion, Economy, and Trade. Advance the ages by upgrading up to 4 Wings on the House of Wisdom.
3. Camel Fighters: Camels spook enemy horse cavalry with their presence, reducing their damage by -20%.
4. Siege Experts: Infantry can construct Rams, Siege Towers, Springalds, and Mangonels without the need for Siege Engineering technology.
5. Grand Orchards: Cultivate Berry Bushes into Orchards by building Mills near them, increasing Food capacity by +100. Villagers gather Berry Bushes 25% faster but cannot gather from Boar. Villagers carry +3 Food from Berry Bushes.
6. Trade Economy: Land Traders are 33% cheaper.
7. Dockyards: Docks can be constructed for -50% Wood.
8. Golden Age: Build towards your Golden Age – improving economy and technology. Buildings within the House of Wisdom's influence receive +5 fire armor and contribute one point towards the Golden Age. The threshold for unlocks are 10, 30, and 60 buildings. • Tier 1: Villager gather rate +15% • Tier 2: Research speed +20% • Tier 3: Villager gathering rate +20% for all resources. Research speeds +20%. Production speeds +20%.
9. Unique Units: Camel Archers: Light ranged cavalry that deals bonus damage to light melee infantry. Camel Riders: Light melee cavalry that deals bonus damage to cavalry. Ghulam: Tough infantry with a double strike attack.

### ay - Ayyubids

Classes: Adaptable, Camels, City Planning
Techtree root node count: 25
Overview entries:
1. Civilization Bonuses: Camel units reduce damage from nearby enemy horse cavalry by -20%. | Mills constructed near Berry Bushes create Orchards, increasing Food capacity by +100. | Gather from Berry Bushes +25% faster but cannot gather from Boar. | Berry carry capacity increased +3. | Land Traders are -33% cheaper. | Docks are -50% cheaper. | Advance to the next Age without the need for Villagers by upgrading wings on the House of Wisdom. | Choose from 8 different Wings with each unlocking a powerful bonus without requiring any additional upgrade. | The bonus provided by a Wing grows in power when researched in later Ages. | Access special bonuses when entering a Golden Age by constructing buildings within the House of Wisdom's influence.
2. Adaptable Commander: Advance through the ages by choosing from 8 unique Wings on the House of Wisdom. Gain immediate access to bonuses for Economy, Technology, and Military without requiring any upgrade in order to adapt the civilization to the needs of battle. Each Wing provides more powerful bonuses when constructed in later Ages.
3. Camel Fighters: Camels spook enemy horse cavalry with their presence, reducing their damage by -20%.
4. Siegecraft Masters: Infantry can construct Siege Engines on the field without the need for Siege Engineering technology. Access to two unique siege weapons and one unique siege upgrade.
5. Grand Orchards: Cultivate Berry Bushes into Orchards by building Mills near them, increasing Food capacity by +100. Villagers gather Berry Bushes 25% faster but cannot gather from Boar. Villagers carry +3 Food from Berry Bushes.
6. Trade Economy: Land Traders are 33% cheaper.
7. Dockyards: Docks can be constructed for -50% Wood.
8. Golden Age: Build towards your Golden Age – improving economy, technology, and military. Buildings within the House of Wisdom's influence receive +5 fire armor and contribute one point towards the Golden Age. The threshold for unlocks are 10, 20, 30, 50, and 75 buildings. • Tier 1: Villager gather rate +10% • Tier 2: Research speed +25% • Tier 3: Production speed +20% • Tier 4: Siege units cost 20% less resources to produce • Tier 5: Camel units attack 20% faster.
9. Unique Units: Desert Raider: Versatile camel rider who can switch between ranged and melee modes. Camel Lancer: Heavy camel with a powerful charge attack. Dervish: Mounted religious unit with a powerful heal ability. Manjaniq: Unique Mangonel which can use an Incendiary mode to deal damage in a greatly increased area. Tower of the Sultan: Behemoth siege weapon crewed by archers and equipped with a battering ram for devastating damage against buildings.

### by - Byzantines

Classes: City Planning, Mercenaries, Defense
Techtree root node count: 33
Overview entries:
1. Civilization Bonuses: Cisterns can be toggled to improve influence of unit production speed, research speed, or building defense. Bonuses improve when connected with Aqueducts. | Field units capable of using various forms of Greek Fire. | Collect bonus Stone from every building constructed. | Harvest Olive Oil that is used to produce Mercenary units. | Produce unique units from other civilizations as Mercenaries from the Mercenary House starting in Feudal Age (II). | Workers generate Olive Oil from Berry Bushes, Olive Groves, and Fish. | Traders provide Olive Oil on successful trades. | Markets can trade Olive Oil. | Transport Ships temporarily increase the move speed of units when unloading.
2. Olive Oil: Collect a unique resource that is used to hire Mercenary units. Villagers gather Olive Oil equal to 50% of Food gathered from Berry Bushes, 20% from Olive Groves, and 10% from Shore Fish. Fishing Boats generate Olive Oil equal to 20% of Food from Fish and Traders provide 20% Olive Oil based on the amount being traded.
3. Mercenaries: Purchase contracts or establish control of Trade Posts to recruit unique units from other civilizations with Olive Oil at the Mercenary House.
4. Cisterns and Aqueducts: Cisterns provide nearby Villagers with boosted gather rates and an influence that enhances nearby buildings, improving unit production speed, research speed, or building defense. Construct an Aqueduct network and connect them to Cisterns to increase its bonus output.
5. Field Stones: Gather Stone from every building constructed. Building size determines the amount of Stone collected.
6. Greek Fire: Cheirosiphons along with upgraded Dromons and Trebuchets fling Greek Fire with their attacks, engulfing the area in flames for damage over time.
7. Mangonel Emplacements: Outposts and Keeps can be upgraded with Mangonel Emplacements. Stone Wall Towers come equipped with Mangonel Emplacements instead of Springalds.
8. Unique Units: Limitanei: Spearman replacement. Light melee infantry with the Shield Wall ability to increase ranged armor at the cost of move speed. Varangian Guard: Man-at-Arms replacement. Use the Berserking ability to increase damage at the cost of armor. Can construct Transport Ships and increase armor of transports when garrisoned. Gains increased movement speed when disembarking from Transport Ships. Cataphract: Knight replacement. Heavy cavalry with Trample, a powerful targeted ability that runs through and damages enemies in its path. Cheirosiphon: A ram equipped with a short ranged Greek Fire attack. Dromon: Springald Ship replacement. Equipped with Greek Fire.

### ch - Chinese

Classes: Dynasties, Gunpowder, Taxes
Techtree root node count: 33
Overview entries:
1. Civilization Bonuses: Begin in the Tang Dynasty - increasing Scouts line of sight by +30% and provides access to the Village. | Units trained, technologies researched, and resources dropped off generate tax (Gold) that can be collected by Imperial Officials. | Enter a new Dynasty by building both Landmarks from an Age to unlock special bonuses, unique units, and buildings. | Villagers construct defenses +50% faster and all other buildings +100% faster. | Chemistry technology granted for free in the Dark Age (I) — Town Centers, Keeps, and Outposts use Handcannon Slits instead of Defensive Arrowslits. | Docks work +10% faster.
2. Great Dynasties: Start your journey in the Tang Dynasty — increases Scout line of sight +30% and provides access to the Village. Construct both Landmarks in an Age to start Dynasties with special bonuses, unique buildings, and units. • Song Dynasty: Produce Villagers +33% faster — unlocks Granary and Zhuge Nu. • Yuan Dynasty: Villagers, Officials and military unit move speed +15% — unlocks Pagoda and Fire Lancer. • Ming Dynasty: Military units +15% health — unlocks Grenadier.
3. Rapid Fabrications: Villagers construct defenses +50% faster and all other buildings +100% faster. Docks work +10% faster.
4. Masters of Gunpowder: Begin the game with Chemistry technology granted for free - defensive buildings use Handcannon Slits over Defensive Arrowslits.
5. Taxes: Units trained, technologies researched, and resources dropped off generate Tax (Gold) that can be collected by Imperial Officials.
6. Influence: Construct military and economic buildings within the Imperial Academy Landmark's influence to generate +100% tax Gold.
7. Unique Units: Imperial Official: Use the Supervise ability to boost production speed of research and military buildings by +150% — supervising economic buildings increases the amount of resources dropped off by Villagers by +20%. Zhuge Nu: Light ranged infantry with a rapid burst attack effective vs. light units. Palace Guard: Man-at-Arms replacement. Heavy melee infantry that exchanges armor for move speed. Nest of Bees: Mangonel replacement. Siege engine that fires a barrage of rockets, doing area of effect damage. Fire Lancer: Light cavalry effective vs. siege engines and buildings. Comes with extensive sight range and an explosive charge attack. Grenadier: Light ranged gunpowder infantry that throws grenades dealing area of effect damage.

### de - Delhi Sultanate

Classes: Elephants, Research, Religion
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Mosque, Scholar, and religious technologies available in the Dark Age (I). | Infantry units are able to construct Palisade Walls. | All technology is free but completes at a much slower rate. Garrison Scholars in Mosques, Madrasas, or Docks to increase research speed. | Technologies being researched can be paused and resumed. | Mills constructed near Berry Bushes create Orchards, increasing Food capacity by +100. | Gather from Berry Bushes +25% faster but cannot gather from Boar. | Berry carry capacity increased +3. | Fishing Ships can defend themselves with a ranged attack.
2. Scholarly Culture: Train Scholars from Mosques in the Dark Age (I). Research and unlock religious technologies earlier than other civilizations.
3. Scholastic Achievements: Save on the cost of technologies and research all technology free but progresses at a much slower rate — technologies can be paused and resumed.
4. Frontier Fortifications: Establish fortified settlements using infantry units that can build Palisade Walls. Construct the Compound of the Defender Landmark to extend this ability to Stone Walls.
5. Defensive Deckhands: Fishing Ships can defend themselves with a ranged attack and have 50% additional health.
6. Garden Bounty: Cultivate Berry Bushes into Orchards by building Mills near them, increasing Food capacity by +100. Villagers gather Berry Bushes 25% faster but cannot gather from Boar. Villagers carry +3 Food from Berry Bushes.
7. Influence: Scholars garrisoned in a Mosque, Madrasa, or Dock will increase the research speed of buildings within their influence, based on how many Scholars are garrisoned globally. Docks work faster when garrisoned by Scholars.
8. Unique Units: Scholar: Religious unit capable of healing in the Dark Age (I). War Elephant: Heavy melee cavalry mounted with a Spearman that has high health and damage with a strong siege attack. Tower Elephant: Ranged cavalry mounted with two Archers that can fire while moving. Ghazi Raider: Fast Horseman wielding a heavy mace.

### en - English

Classes: Defense, Longbows, Farming
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Town Centers, Outposts, Towers, and Keeps increase attack speed of nearby units by +20% when enemies are in range. | Farms are -50% cheaper to construct — Farms near mills gather +20/25/30/30% faster by Age. | Vanguard Man-at-Arms in the Dark Age (I). | Produce Man-at-Arms +50% faster than other civilizations. | Villagers wield short bows when attacking enemy units. | Keeps can produce all military units. | Ships are -10% cheaper to produce. | Scouts and Men-at-Arms can setup campfires to increase line-of-sight and improve nearby hunting by +10%.
2. Network of Castles: Protect the frontier with Town Centers, Outposts, Stone Wall Towers, and Keeps that increase attack speed of nearby units by +20% when enemies are in range. Research the Network of Citadels technology from Keeps to further increase attack speed by +30%.
3. Keep Production: Keeps have the unique ability to produce all military units.
4. Call to Arms: Vanguard Man-at-Arms available in the Dark Age (I) — English Man-at-Arms produce +50% faster.
5. Defensive Byrig: Capital Town Center fires an extra arrow and Villagers wield short bows when attacking enemy units.
6. Island of Agriculture: Farms are -50% cheaper to construct. Research the Enclosures technology in the Imperial Age (IV) to allow Villagers to generate +1 Gold every 6 seconds when working Farms.
7. Shipwrights: Naval conditioning increases Dock efficiency, reducing ship construction costs by -10%.
8. Influence: Farm harvest rates increase within the influence of a Mill by +20/25/30/30% after each age up.
9. Kingswood: Scouts and Men-at-Arms can create a Campfire, which increases the sight range of nearby units by +30% and the gather rate of nearby hunters by +10%.
10. Unique Units: Longbowman: Archer with +2 range and +1 damage that comes with the Defensive Paling ability to stun and damage enemy cavalry.

### fr - French

Classes: Trade, Cavalry, Keeps
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Royal Knights in the Feudal Age (II). | Town Centers work rate increased per age up +15%, +15%, +20%, +25%. | Resource drop off buildings -50% cheaper. | Economic technologies are -35% cheaper. | Trade Posts are revealed on the minimap. | Traders can return Food, Wood, or Gold to Markets. | Trade Ships return +20% resources. | Blacksmiths grant melee damage technologies for free after each age up.
2. Royal Stallions: Deploy the Royal Knight in the Feudal Age (II) and research powerful unique technologies for cavalry.
3. Mainland Economy: Wield a superior economy with -50% cheaper resource drop-offs and -35% cheaper economic technologies. Town Center production speed increased per age +15%, +15%, +20%, +25%.
4. Trade Economy: Choose to return Food, Wood, or Gold to Markets with Traders and Trade Ships. Trade Ships return +20% more resources. Trade Posts are revealed on the minimap at the start of the game. Docks provide populations space.
5. Smithy's Grace: Blacksmiths grant melee damage technologies for free after each age up.
6. Influence: Maintain offensives with -10% cheaper Keeps that reduce the cost of units produced from Archery Ranges and Stables within their influence by -20%.
7. Unique Units: Royal Knight: Heavy Cavalry that gains +3 bonus damage for 5 seconds after completing a charge. Arbalétrier: Crossbowman with +1 melee armor that can deploy a defensive Pavise to provide +5 ranged armor and +1 weapon range for 30 seconds. Cannon: Bombard replacement with more damage, mobility and no setup time. Galleass: Large war galley that has a long range forward mounted bombard. War Cog: Unique Springald Ship with reduced cost and increased ranged armor.
8. (translation not found) (undefined): (translation not found) (undefined)

### gol - Golden Horde

Classes: Aggression, Cavalry, Horde
Techtree root node count: 18
Overview entries:
1. Civilization Bonuses: Start with maximum population limit. | Units are always recruited in batches. | Stockyards are a unique building that can be worked by 4 villagers and is a food drop-off. | Ovoos can be built on multiple Stone deposits increasing Stone income. | Unique technologies costing only Stone. | Stables available in the Dark Age (I). | Age up by building and upgrading the Golden Tent. | Fortified Outposts provide influence or aura bonuses based on the Edict set in the Golden Tent. | Silk Road: Traders generate +10% additional Food, Wood and Gold with 5/10/15 active Traders. | Transport ships have +50% health and +15% move speed. | Scouts can deploy the Scouting Falcon ability to keep watch over the surrounding area.
2. Golden Tent: The Golden Tent is the only landmark for the Golden Horde, which can be upgraded to advance to the next age and increase the health of the building. An edict can be chosen on the Golden Tent, which changes the influence or aura bonus provided by Fortified Outposts. The Batu Khan and Torguud can be recruited from the Golden Tent.
3. Hordes: Units are produced in batches of two. Technologies can be researched that improve batch production.
4. Stockyard: Construct the Stockyard instead of Farms or Pastures for Food — Stockyards have Sheep carcasses which can be gathered and dropped off at the Stockyard directly.
5. Fortified Outposts: Fortified Outposts have more health and provide influence or aura bonuses depending on the Edict chosen on the Golden Tent.
6. Augmented Transports: Transport Ship landings are faster and more durable with +50% health and +15% move speed.
7. Silk Road: Explore the Silk Road with Traders that receive extra resources from trades based on your total number of active Traders. • 5+ Traders: +10% Food • 10+ Traders: +10% Food, Wood • 15+ Traders: +10% Food, Wood, Gold
8. Stone Tech and Ovoos: Construct Ovoo over Stone outcroppings to harvest Stone without the need for Villagers. The maximum number of Ovoos that can be built is increased +1 per age up.
9. Scouting Falcon: Scouts can deploy the Scouting Falcon ability to keep watch over the surrounding area.
10. Unique Units: Golden Horde Khan: Heavy Cavalry that scales in strength on age up. Can fire an arrow that increases the damage taken by enemies in an area. The Khan will also provide an increasing attack damage aura the longer the Khan is in combat. Torguud: Heavy Cavalry which can protect the Khan, redirecting any damage taken by the Khan to the Torguud. Kharash: Weak Light Melee Infantry units that provide armor to nearby allies. Kipchak: Horse archer that can fire arrows which cause the target hit to bleed. Traction Trebuchet: Faster move speed, setup time and attack speed. Keshik: Heavy Cavalry available in Feudal Age, regenerates Health after every attack.

### hl - House of Lancaster

Classes: Manors, Defense, Economy
Techtree root node count: 31
Overview entries:
1. Civilization Bonuses: Villagers gather from sheep +20% faster. | Build Manors to passively generate food and wood. | Town Centers spawn 4 sheep when built. | Keeps grant 3 free Earl's Guards when built. | Active Keeps improve the damage of Earl's Guards and Demilancers. | Villagers wield short bows when attacking enemy units. | Ships are -10% cheaper to produce.
2. Feudalism: Build Manors to generate passive income in the Feudal Age. Manors act as a drop off building for all resource types and provide +10 population space. Each Manor generates 30 food and 10 wood per minute, and an additional 4 food and 2 wood for each nearby villager. Increase the build limit of Manors with unique technologies.
3. Wool Industries: Each Town Center spawns 4 sheep upon completion. Villagers gather from sheep +20% faster.
4. Defensive Byrig: Capital Town Center fires an extra arrow and Villagers wield short bows when attacking enemy units.
5. A House Unified: Keeps grant 3 free Earl's Guards upon being built. Each Active keep grants +1 damage to Earl's Guards and Demilancers up to a maximum of +4.
6. Shipwrights: Naval conditioning increases Dock efficiency, reducing ship construction costs by -10%.
7. Unique Units: Yeoman: Archer Replacement. Ranged infantry with increased speed and range. Can be upgraded to fire a devastating volley of arrows into the targeted area. | Hobelar: Horseman Replacement. Cheap and expendable cavalry with high ranged armor. | Earl's Guard: Man-at-Arms Replacement. Heavy Melee Infantry that periodically throws daggers. | Demilancer: Special Heavy Cavalry. Accessed only via landmarks, the Demilancer is a durable cavalry unit with low damage.

### hr - Holy Roman Empire

Classes: Infantry, Religion, Defense
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Place Relics in Outposts, Stone Towers and Keeps for defensive and economic bonuses. | Relics placed in Docks increase ship attack speed by +5% per Relic (Max +25%). | Early Man-at-Arms in the Feudal Age (II). | Infantry move 5% faster in the Dark Age (I) and 10% faster from the Feudal Age (II). | Emplacements are -20% cheaper. Outpost sight range increased by +20%. | Villagers carry +40% more resources. | Prelates can heal and use Holy Inspiration in the Dark Age (I) — inspired Villagers gather +35% faster for 30 seconds. | Buildings within influence of a Town Center gain the Emergency Repairs ability which can be activated to repair the building.
2. Religious Zeal: Demonstrate the might of the empire by placing Relics in Outposts, Towers, and Keeps - increasing their armor by +25%, damage by +25%, range by +25%, and line of sight by +20%. Relics placed in Docks increase ship attack speed by +5% per Relic (Max +25%). Relics placed in buildings generate +80 Gold per minute.
3. Army of the Empire: Infantry move 5% faster in the Dark Age (I) and 10% faster from the Feudal Age (II). Upgrade infantry with impactful technologies and field the Early Man-at-Arms in the Feudal Age (II).
4. Emplacement Architecture: All emplacement technologies are -20% cheaper. Outpost sight range increased by +20%.
5. Pushcarts: Villagers carry +40% more resources than other civilizations.
6. Influence: Buildings constructed within the influence of a Town Center gain the Emergency Repairs ability which can be activated to repair the building for +150 health every second for 20 seconds.
7. Unique Units: Prelate: Use the Holy Inspiration ability on Villagers increasing their gather rate by +35% for 30 seconds. Landsknecht: Light melee infantry with a large two-handed sword capable of doing significant area damage. Black Rider: Powerful armored mounted gunner. Production is limited by the number of constructed Keeps.

### ja - Japanese

Classes: Agriculture, Bannermen, Infantry
Techtree root node count: 29
Overview entries:
1. Civilization Bonuses: Town Centers can be upgraded to improve defenses, harvest rates of nearby Farms, and the production cap of Samurai Bannermen. | Samurai Bannermen provide bonuses to nearby infantry and cavalry. | Samurai have Deflective Armor that can block ranged or melee attacks. | Barracks are cheaper to build. | Farmhouses are Food drop-off sites in addition to providing Population. | Forges are Gold and Stone drop-off sites in addition to containing military upgrades. | Gold deposited by Villagers generates bonus Stone and vice versa. | Extra melee damage upgrade accessible in the Dark Age (I). | Choose between Buddhist Monks or Shinto Priests with your choice of Castle Age (III) Landmark. | Keeps come equipped with Rocket Emplacements and increased health in the Imperial Age (IV). | Fishing Boats are cheaper to produce.
2. Daimyo: Town Centers can be upgraded into special buildings called the Daimyo Manor, Daimyo Palace, and Shogunate Castle. These buildings provide bonuses to nearby Villagers working Farms by 20%, 40%, 60%, increases the capacity of Samurai Bannerman by +1, +2, +3, and improves its defenses.
3. Hatamoto Samurai: Field elite Samurai Bannermen that provide +15% bonus damage to nearby infantry and cavalry. Bannermen Samurai drop their banners when killed, providing the same effect for a duration.
4. Calm of Mind: Produce Samurai in the Dark Age (I). Samurai have the Deflective Armor ability which can periodically block melee or ranged attacks.
5. Farmhouse & Forge: The Forge is a Gold and Stone drop-off and replaces the Mining Camp and Blacksmith. Additionally, it provides extra melee damage technology in the Dark Age (I). The Farmhouse both provides population and replaces the Mill as a Food drop-off.
6. Oda's Fortress: Access a more powerful Keep in the Imperial Age (IV) that comes with increased health and Rocket Emplacements for a higher cost. Rockets attack quickly and deal massive damage to single targets.
7. Silver Mining: When Villagers deposit Gold, 20% extra Stone is also produced and vice versa.
8. Religious Choice: Select between Shinto and Buddhism with your choice of Age III Landmark. If choosing Shinto, you unlock the Shinto Priest. If choosing Buddhism, you unlock the Buddhist Monk. These religious units offer unique bonuses.
9. Samurai Districts: Barracks are 50% cheaper to construct.
10. Fishing Village: Fishing Boats are produced 25% cheaper.
11. Unique Units: Samurai: Man-at-Arms replacement. Heavy melee infantry that have Deflective Armor which can block melee and ranged attacks. | Mounted Samurai: Lancer replacement. Heavy melee cavalry with Deflective Armor. | Yumi Ashigaru: Archer with improved move speed for reduced cost and health. | Onna-Bugeisha: Light melee infantry that can use their fast move speed and long weapon range to keep their opponent on alert. | Onna-Musha: Crossbowman replacement. Cavalry Archer that can use increased mobility to harass heavy targets. | Shinobi: Espionage unit that can act as a spy, sabotage buildings, or assassinate targets. Produced from the Koka Township Landmark. | Ozutsu: Heavy ranged gunpowder infantry that has a huge handheld cannon with high siege and splash damage. Produced from the Tanegashima Gunsmith Landmark.

### je - Jeanne d'Arc

Classes: Trade, Cavalry, Hero
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Jeanne d'Arc navigates the Journey of a Hero. | Royal Knights in the Feudal Age (II). | Economic technologies are -35% cheaper. | Trade Posts are revealed on the minimap. | Traders can return Food, Wood, or Gold to Markets. | Trade Ships return +20% resources.
2. Journey of a Hero: Jeanne d'Arc is present on the battlefield. A heroic unit who gains experience for completing tasks such as gathering resources, constructing buildings, and participating in combat. After accruing enough experience, Jeanne may level up to obtain powerful economic and combat abilities.
3. Royal Stallions: Deploy the Royal Knight in the Feudal Age (II) and research powerful unique technologies for cavalry.
4. Galvanized Economy: The people work harder under Jeanne d'Arc's leadership. Economic upgrades are 35% cheaper.
5. Trade Economy: Choose to return Food, Wood, or Gold to Markets with Traders and Trade Ships. Trade Ships return +20% more resources. Trade Posts are revealed on the minimap at the start of the game. Docks provide populations space.
6. Unique Units: Jeanne d'Arc: A hero unit that starts as a villager, Jeanne begins the Journey of a Hero to gain powerful abilities. Jeanne's Rider: Fast Cavalry effective at raiding, flanking, and countering Crossbows, becomes available once Jeanne achieves level 3. Jeanne's Champion: Tough infantry that excels at countering Spearmen, becomes available once Jeanne achieves level 3. Royal Knight: Heavy Cavalry that gains +3 bonus damage for 5 seconds after completing a charge. Arbalétrier: Crossbowman with +1 melee armor that can deploy a defensive Pavise to provide +5 ranged armor and +1 weapon range for 30 seconds. Cannon: Bombard replacement with more damage, mobility and no setup time. Galleass: Large war galley that has a long range forward mounted bombard. War Cog: Unique Springald Ship with reduced cost and increased pierce armor.

### kt - Knights Templar

Classes: Pilgrims, Commanderies, Knights
Techtree root node count: 23
Overview entries:
1. Civilization Bonuses: Age Up at the Town Center by establishing a Commanderie. | Commanderies permanently unlock units and bonuses. | Pilgrims generate gold by traveling to Sacred Sites. | Build Fortresses in the Feudal Age. | Fortresses increase the range of nearby units and health of nearby Stone Walls. | Fortresses act as Landmarks, but can be fully destroyed. | Lumberjacks deposit wood automatically and gather faster with each Age. | Siege Workshops and Siege Engines cost less wood. | Trebuchets fire an additional projectile.
2. Establish Commanderies: Age Up at the Town Center by establishing one of three unique Commanderies. Each Commanderie permanently unlocks a unique unit and bonus.
3. Frankish Defensive Schemes: Fortresses replace Keeps and are available in the Feudal Age. Ranged units positioned near a Fortress have +15% increased attack range, and Stone Walls placed within the influence of a Fortress or the Templar Headquarters have +25% increased health and gain a default arrow. Fortresses behave as Landmarks but can be fully destroyed.
4. Pilgrimage: The Knights Templar cannot train Traders, instead they generate gold from successful pilgrimages. Upon reaching the Feudal Age, the Knights Templar may offer Safe Passage for Pilgrims to travel to a Sacred Site. Every 60 seconds, a group of Pilgrims will travel from the Templar Headquarters to the selected Sacred Site, generating gold upon arrival based on the distance traveled. The size of the group is increased by 1 for each active Fortress up to a maximum of 10. Sacred Sites and Relics are revealed at the start of the game.
5. Coastal Harbors: Build Harbors instead of Docks, which are more expensive but have increased health, a stronger emplacement, more garrison space for fishing ships, and increase the health of nearby ships.
6. Landscape Preservation: Villagers automatically deposit wood without a Lumber Camp. Wood is gathered +20% faster in each Age and 20% of the wood gathered is produced as additional food.
7. Siege Experts: Trebuchets fire additional projectiles and can be deployed atop Fortresses with a unique emplacement. Siege Workshops and Siege Engines cost -25% less wood.
8. Unique Units: Templar Brother: Knight replacement. More expensive than a regular Knight, but has additional health and damage. Feudal Age Knight Hospitaller Commanderie - Hospitaller Knight: Heavy Melee Infantry that can heal nearby friendly units. Kingdom of France Commanderie - Chevalier Confrere: Heavy Cavalry that is cheaper than a regular Knight. Gains additional health for each nearby Heavy Cavalry unit. Principality of Antioch Commanderie - Serjeant: Heavy Infantry with high melee armor. Throws axes which deal melee damage from range. Castle Age Angevin Empire Commanderie - Heavy Spearman: Armored Spearman that is stronger around Fortresses. Republic of Genoa Commanderie - Genoese Crossbowman: Expensive Crossbowman that deals additional damage to melee infantry. Kingdom of Castile Commanderie - Genitour: Mounted Javelineer that excels against ranged units. Imperial Age Kingdom of Poland Commanderie - Szlachta Cavalry: Elite Cavalry with exceptional ranged armor. Slows the attacks of enemies it damages and deals additional damage to light infantry. Teutonic Order Commanderie - Teutonic Knight: Absurdly Powerful Heavy Infantry that gains power for each enemy felled in combat. Reduces the armor of nearby enemies. Republic of Venice Commanderie - Condottiero: Fast infantry that costs only gold. Strong against Gunpowder units. Venetian Galley: Large oared vessel with a long range forward mounted Trebuchet. Venetian Trader: Expensive but fast moving trader. Max Build limit of 5.

### ma - Malians

Classes: Gold Economy, Infantry, Cattle
Techtree root node count: 32
Overview entries:
1. Civilization Bonuses: Construct Pit Mines on Gold Veins to generate Gold without depleting the deposit. | Produce Cattle from Mills in the Dark Age (I). Malian Villagers harvest Food from Cattle faster than other civilizations or they can be garrisoned in a Cattle Ranch for Food over time. | Musofadi units can use the Activate Stealth ability to setup ambush attacks. | Five unique units with a different take on the counter system. | Veteran unit technologies are researched in half the time and cost. | Gold collected from Trader routes reduce the research time of future technologies. | Traders and Trade Ships that pass by Toll Outposts instantly provide bonus Gold based on the amount of Gold being carried. Does not generate any bonus tax if a toll outpost is built within range of another one. | Fishing Boats drop off 10% of their Food as Gold. | Movement speed of all ships is increased when near Docks. | Transport Ships attack with javelins for each unit garrisoned. | Houses construct twice as fast, but are half cost and provide half the amount of Population. | Cannot harvest Boar
2. Pit Mines: Wield a superior Gold economy and construct the Pit Mine over top of Gold Veins in the Dark Age (I) to generate Gold without depleting it. Villagers can mine Gold while the Pit Mine is active. If the Gold Vein is completely exhausted, the Pit Mine will continue to extract Gold from the deposit.
3. Influence - Mining Communities: Each House and Mining Camp constructed within the influence of Pit Mines increases its Gold generation. Town Centers cost gold instead of stone to construct.
4. Cattle & Ranches: Produce Cattle from Mills in the Dark Age (I). Malian Villagers harvest Food from Cattle faster than other civilizations or they can be garrisoned in a Cattle Ranch for Food over time.
5. Musofadi Pathfinder: Musofadi Warrior and Musofadi Gunner unique units can use the Activate Stealth ability to sneak around and create ambush opportunities.
6. Farari's Knowledge: Veteran unit technologies unlocked in the Castle Age (III) are researched at half the time and cost.
7. Toll Outposts: Traders and Trade Ships that pass by Toll Outposts instantly provide bonus resources based on the current trade targets. Does not generate any bonus tax if a Toll Outpost is built within range of another one.
8. Manuscript Trade: Gold collected from completed Trader routes lower the research time of future technologies.
9. Fish Processing: Fishing Boats drop off 10% of their Food as Gold.
10. Landing Parties: Movement speed of all ships increased when near their Docks. Transport Ships attack with javelins for each unit garrisoned.
11. Unique Units: Donso: Spearman replacement. Light melee infantry with increased health and melee armor that can periodically throw a javelin. | Warrior Scout: Light cavalry that can improve damage, move speed, health, and health regeneration. | Musofadi Warrior: Fast, light, anti-armor infantry that can use the Activate Stealth ability. | Javelin Thrower: Anti-ranged infantry that throws a javelin from extended range. | Sofa: Faster heavy cavalry with reduced cost, health, and armor. | Musofadi Gunner: Faster moving handcannoneer that can use the Activate Stealth ability.

### mac - Macedonian Dynasty

Classes: Varangians, Silver, Technology
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Villagers extract Silver from Gold and Stone to research unique technologies. | Generate Silver passively on Mining Camps and Town Centers with influence of Varangian Arsenals. | Exceed three tiers of technologies with the Varangian Arsenal by spending Silver. | Access to Early Varangian Guard in the Feudal Age (II). | Produce all unique Varangian units from the Varangian Stronghold. | Varangian units have unique abilities to improve their combat effectiveness. | Reinforce warriors that fall in battle for free with the Varangian Warcamp. | Field units capable of using various forms of Greek Fire. | Transport Ships temporarily increase the move speed of units when unloading.
2. Galena Gathering: Villagers discover abundant galena deposits among Gold Veins and Stone Outcroppings and extract Silver as a unique resource when mining from them. Villagers extract Silver equal to 40% of Gold or Stone mined.
3. Influence - Silver Minting: (translation not found) (undefined)
4. Varangian Smithing: Research unique military technologies at the Varangian Arsenal for Silver. Replaces the Blacksmith and University. Macedonian Dynasty can exceed three tiers of military upgrades per category.
5. Strongholds: Fortify the empire with Varangian Strongholds that can produce all Varangian units and defend with arrows.
6. Warcamp: Choose reinforcements at the Varangian Warcamp. Once enough warriors fall in battle, free Varangian warriors arrive at the warcamp to bolster missing ranks. If adjacent to water, boats can be selected as reinforcements.
7. Varangian Runestones: Carve Runestones to honor past victories in combat. After enough enemies have fallen to Varangians, a Runestone may be created that inspires nearby Varangians with combat bonuses in an area.
8. Greek Fire: Cheirosiphons along with upgraded Dromons, Springalds, and Trebuchets fling Greek Fire with their attacks, engulfing the area in flames for damage over time.
9. Mangonel Emplacements: Outposts and Keeps can be upgraded with Mangonel Emplacements. Stone Wall Towers come equipped with Mangonel Emplacements instead of Springalds.
10. Unique Units: Atgeirmaðr: Spearman replacement. Light melee infantry with a passive ability that increases their attack speed when Varangian units are nearby. Bogmaðr: Archer replacement. Light ranged infantry with an ability to bypass armor at the cost of move speed. Early Varangian Guard: Man-at-Arms replacement. Use the Berserking ability to increase damage at the cost of armor. Can construct Transport Ships and increase armor of transports when garrisoned. Riddari: Knight replacement. Heavy cavalry with an ability to throw axes from range for a period of time. Cheirosiphon: A ram equipped with a short ranged Greek Fire attack. Dromon: Springald Ship replacement. Equipped with Greek Fire.

### mo - Mongols

Classes: Aggression, Cavalry, Nomadic
Techtree root node count: 20
Overview entries:
1. Civilization Bonuses: Start with a packed Ger, maximum population limit, and no need for Houses. | All buildings can be packed up and redeployed to a new location. | Plunder +25 Food and Gold by igniting or destroying enemy buildings under construction. | Stables available in the Dark Age (I). | Horsemen train +25% faster. | Outposts increase move speed of nearby cavalry and Traders by +15%. | Double produce units or research advanced versions of technologies using Stone. | Silk Road: Traders generate +10% additional Food, Wood and Gold with 5/10/15 active Traders. | Transport ships have +50% health and +15% move speed.
2. Great Dominion: All buildings can be packed up and redeployed to a new location. Forgo the need to build Houses and begin the game with maximum Population. Respond to enemy movements quickly with a network of Outposts which provide +15% move speed to nearby cavalry and Traders.
3. Khanate: Field the mighty Khan in the Dark Age (I) to provide powerful bonuses to all nearby military units with Signal Arrows. Khans and Scouts can deploy the Scouting Falcon ability to keep watch over the surrounding area.
4. Expert Horsemen: Construct Stables as early as the Dark Age and field Horsemen +25% faster.
5. Nomadic Harvesters: Construct Pastures instead of Farms to raise Sheep for Food — Pastures produce Sheep quicker when within the influence of an Ovoo.
6. Raid Bounty: Plunder enemy buildings for +25 Food and Gold when ignited or destroyed under construction.
7. Augmented Transports: Transport Ship landings are faster and more durable with +50% health and +15% move speed.
8. Silk Road: Explore the Silk Road with Traders that receive extra resources from trades based on your total number of active Traders. • 5+ Traders: +10% Food • 10+ Traders: +10% Food, Wood • 15+ Traders: +10% Food, Wood, Gold
9. Influence: Construct the Ovoo over Stone outcroppings to generate influence and harvest Stone without the need for Villagers. Ovoos harvest +70, 100, 130, 160 Stone per minute after each age up. Buildings within the influence of an Ovoo are able to double produce units or research improved versions of technologies using Stone.
10. Unique Units: Khan: Horse archer that scales in strength and unlocks the Signal Arrow abilities after each age up. • Maneuver Arrow: Move speed increased +33%. • Attack Speed Arrow: Attack speed increased +50%. • Armor Arrow: Armor increased +2. Mangudai: Horse archer that can fire while moving in all directions. Traction Trebuchet: Faster move speed, setup time and attack speed. Keshik: Heavy Cavalry available in Feudal Age, regenerates Health after every attack.

### od - Order of the Dragon

Classes: Quality, Infantry, Defense
Techtree root node count: 0
Overview entries:
1. Civilization Bonuses: Villagers carry +40% more resources, gather +28% faster, and construct and repair buildings +20% faster. | Infantry and cavalry units are much stronger, but also more expensive to produce and take twice the population | Place Relics in Outposts, Stone Towers and Keeps for defensive and economic bonuses. | Relics placed in Docks increase ship attack speed by +5% per Relic (Max +20%). | Emplacements are -20% cheaper. Outpost sight range increased by +20%. | Buildings within influence of a Town Center gain the Emergency Repairs ability which can be activated to repair the building.
2. Efficient Villagers: Villagers gather 28% quicker, construct and repair buildings 20% faster, but cost 20% more Food to produce.
3. Elite Equipment: Research technologies like Heavy Torches, Scale Armor, and War Horses to further strengthen the might of the Order.
4. Emplacement Architecture: All emplacement technologies are -20% cheaper. Outpost sight range increased by +20%.
5. Pushcarts: Villagers carry +40% more resources than other civilizations.
6. Influence: Buildings constructed within the influence of a Town Center gain the Emergency Repairs ability which can be activated to repair the building for +150 health every second for 20 seconds.
7. Unique Units: The elite infantry and cavalry units of the Order - such as the Gilded Man-at-Arms, the Gilded Knight and others - have nearly twice the health of regular units and deal significantly more damage. However, they are much more costly to train and take up double the population space.

### ot - Ottomans

Classes: Imperial Council, Military Schools, Siege
Techtree root node count: 31
Overview entries:
1. Civilization Bonuses: Training units and advancing the ages grant experience towards Vizier Points, the higher cost of the action, the more experience is earned. Gain up to five Vizier Points and spend them to unlock powerful unique Ottoman bonuses. | Military Schools can produce units continuously at no cost. | Influence from Blacksmiths and Universities provide increased military unit production speeds after each age up. | Military and technology buildings are cheaper. | Janissary handcannoneer unit available in the Castle Age (III). Able to repair siege engines. | Mehter war drummer enhances the attack and defenses of nearby military units. | Field the Great Bombard siege engine with longer range and area damage. | Produce the Grand Galley ship that can convert into a floating Military School. | Movement speed of Trade Ships and Transport Ships increased. | Cannot harvest Boar.
2. Military School Training: Construct the Military School building that can produce a specific type of unit continuously at no cost, however they are produced at a slower rate.
3. Imperial Council: Training units and advancing through the ages will grant experience towards Vizier Points, the higher cost of the action, the more experience earned. Gain up to five Vizier Points and spend them to unlock powerful unique Ottoman bonuses.
4. Military Inducement: Train, upgrade, and assemble an army with cheaper military and technology buildings.
5. Shipping Routes: Movement speed of Trade Ships, Fishing Boats, and Transport Ships increased.
6. Influence: Military production buildings constructed within the influence of a Blacksmith or University gain increased production speed with each age up.
7. Unique Units: Sipahi: Horseman replacement. Activate the Fortitude ability to deal extra damage to ranged units but receive more damage from melee weapons. Mehter: Mounted war drummer that provides military enhancements to nearby units when toggling the War Drums ability. • Attack Drums: Increased attack speed. • Melee Defense Drums: Increased melee armor. • Ranged Defense Drums: Increased ranged armor. Janissary: Powerful handcannoneer that can repair siege engines and deal bonus damage to cavalry. Grand Galley: Large war galley that can convert into a floating Military School. Great Bombard: Largest gunpowder siege engine that can be fielded. Has long range and area damage attack. Akinji: Long-ranged cavalry which fires two arrows in quick succession. Must be unlocked through the Imperial Council.

### ru - Rus

Classes: Expansion, Cavalry, Hunting
Techtree root node count: 30
Overview entries:
1. Civilization Bonuses: Construct Fortified Palisade Walls with +100% health. | Construct Wooden Fortresses — improved Outposts with +100% health and +3 garrison slots. | Construct Hunting Cabins — improved Mills that produce Scouts and generate Gold from nearby forests. | Gathering from animals earns a bounty of Gold — increased bounty provides economic bonuses to Villagers and Hunting Cabins. | Early Knight available in the Feudal Age (II). | Lodya ship can convert into any type of ship for a cost. | Fishing Ships don't have to return to a dock to drop off Food.
2. Woodland Federation: Fortify the countryside with Wooden Fortresses that replace Outposts — comes with +100% health and +3 garrison slots. Construct the Fortified Palisade Wall — comes with +100% health and faster build time.
3. Hunter Princes: Live off the land with Scouts trained from Hunting Cabins. Hunting Cabins provide the benefits of a standard Mill but with the ability to see into Stealth Forests and generate Gold based on the number of nearby trees.
4. Druzhina Retinue: Field the Early Knight in the Feudal Age (II).
5. Lodya Reconstitution: Lodya ship can convert into any type of ship for a cost. Lodya Fishing Ships process Food directly on the vessel — forgoing the need to return to Docks to drop off Food.
6. Bounty Rewards: Gathering from animals earns a bounty of Gold and reaching certain thresholds of total bounty provides economic bonuses to Villagers and Hunting Cabins. 100 Bounty • +5% Food gather rate • Hunting Cabins generate 10% more Gold 400 Bounty • +10% Food gather rate • Hunting Cabins generate 25% more Gold 1000 Bounty • +15% Food gather rate • Hunting Cabins generate 40% more Gold
7. Influence: Oversee clear-cutting initiatives — Villagers drop off +20% more Wood when Lumber Camps and Town Centers are within a Wooden Fortress's influence.
8. Unique Units: Warrior Monk: Religious light cavalry unit that inspires nearby units when in combat, providing +1 armor and +2 damage. Horse Archer: Light ranged cavalry with high mobility and damage. Streltsy: Handcannoneer which gets stronger when stationary and has a high damage melee attack. Lodya ships: Can be converted into any type of ship.

### sen - Sengoku Daimyo

Classes: Agriculture, Daimyo, City Planning
Techtree root node count: 31
Overview entries:
1. Civilization Bonuses: Daimyo Estates can be dedicated to a clan to provide bonuses to melee infantry, cavalry or ranged infantry. | Farmhouses are Food drop-off sites in addition to providing Population. | The Matsuri is a unique early Market that can recruit Yatai which can passively gather food from nearby Food sources. | Survival Techniques researched by default. | Forges are Gold and Stone drop-off sites in addition to containing military upgrades. | Gold deposited by Villagers generates bonus Stone and vice versa. | Extra melee damage upgrade accessible in the Dark Age (I). | Ikko-ikki are combat monks that can be recruited from Buddhist Monasteries that heal while attacking. | Keeps come equipped with Rocket Emplacements and increased health in the Imperial Age (IV). | Fishing Boats are cheaper to produce. | The location of all Deer and Boar are revealed on the map.
2. Daimyo Estate: Daimyo Estates are unique buildings that can be dedicated to one of three clans. Hojo clan which improves melee infantry, Oda clan which improves ranged infantry, or Takeda clan which improves cavalry. The Daimyo Estate also has an influence that increases production speed of military buildings.
3. Yatai and Matsuri: The Matsuri is a unique early Market that can produce Yatai. The Yatai is a unique worker unit that will slowly generate food from Food sources within 2 tiles without killing or consuming them. If the Yatai collects enough Food it will send a Food Trader back to the Matsuri which improves an aura that increases the gather rate of nearby villagers.
4. Farmhouse & Forge: The Forge is a Gold and Stone drop-off and replaces the Mining Camp and Blacksmith. Additionally, it provides extra melee damage technology in the Dark Age (I). The Farmhouse both provides population and replaces the Mill as a Food drop-off.
5. Oda's Fortress: Access a more powerful Keep in the Imperial Age (IV) that comes with increased health and Rocket Emplacements for a higher cost. Rockets attack quickly and deal massive damage to single targets.
6. Silver Mining: When Villagers deposit Gold, 20% extra Stone is also produced and vice versa.
7. Fishing Village: Fishing Boats are produced 25% cheaper.
8. Deer and Boar Reveal: The location of all Deer and Boar are revealed on the map.
9. Unique Units: Yatai: Worker unit that will passively collect food from nearby Food sources without killing or consuming them. | Yari Cavalry: Fast cavalry effective at raiding, flanking, and countering ranged units. Bonus damage against cavalry. | Daimyo: High health and damage melee cavalry that provides an aura that increases attack speed of nearby military units. Effective against melee units. Limited to one per Daimyo Estate built. | Yumi Ashigaru: Archer with improved move speed for reduced cost and health. | Ikko-ikki Monk: Warrior Monk with strong combat capabilities that heals nearby units when attacking. Does not have a targeted heal ability. | Kanabo Samurai: Tough infantry with good damage. Deals bonus damage based on the max health of the enemy. | Early Ozutsu: Heavy ranged gunpowder infantry that has a huge handheld cannon with high siege and splash damage.

### tug - Tughlaq Dynasty

Classes: Elephants, Forts, Governors
Techtree root node count: 28
Overview entries:
1. Civilization Bonuses: Town Centers, Worker Elephants, and Docks provide bonus resources when Villagers and Fishing Ships drop off. | Worker Elephants move freely and act as universal resource drop-offs. | All technology is more expensive but research near instantly. | Tughlaqabad Forts act as Keeps and are available from the Feudal Age (II). | Tughlaqabad Forts can be upgraded to increase defenses and unlocks Governors. | Select a Governor at any fort to take the dynasty to new heights. | Governors provide economy, tempo, military, research, and religious bonuses. | Infantry units are able to construct Palisade Walls. | Gather from Berry Bushes +30% faster but cannot gather from Boar. | Berry carry capacity increased +3. | Fishing Ships can defend themselves with a ranged attack.
2. Working Companions: Take the load off your Villagers back with Worker Elephants. These elephants act as a universal drop-off and can move around freely, saving time and resources for Villagers to focus on working. Worker Elephants, Town Centers, and Docks provide bonus resources when Villagers and Fishing Ships drop off.
3. Erudition: Seeking knowledge and wisdom the Tughlaq Dynasty funds researching technologies with more resources in favor of near instant research times.
4. Legendary Forts: Strike fear into your enemies with the Tughlaqabad Fort. Available from the Feudal Age (II), this defensive building can be upgraded to increase its damage output, health, and unlocks your choice in a Governor.
5. Governor Support: Choose between one of any six Governors at the Tughlaqabad Fort to help lead the Tughlaq Dynasty to new heights. Governor strength increases with each Tughlaqabad Fort improvement upgrade. Governors provide economy, tempo, military, research, and religious bonuses. One Governor may be active per fort.
6. Basketry: Villagers gather Berry Bushes 30% faster but cannot gather from Boar. Villagers carry +3 Food from Berry Bushes.
7. Frontier Fortifications: Establish fortified settlements using infantry units that can build Palisade Walls.
8. Defensive Deckhands: Fishing Ships can defend themselves with a ranged attack and have 50% additional health.
9. Unique Units: Raiding Elephant: Fast elephant effective at raiding, flanking, and countering ranged units. Can trample to bypass any unit to deal damage in an area. Healer Elephant: High health and armored melee elephant mounted with two Imams that can heal units individually. Deals more damage for each nearby melee infantry. War Elephant: Heavy melee cavalry mounted with a Spearman that has high health and damage with a strong siege attack. Ballista Elephant: Ranged elephant mounted with a ballista thats effective against melee units and can pierce multiple targets.

### zx - Zhu Xi's Legacy

Classes: Dynasties, Taxes, Technology
Techtree root node count: 33
Overview entries:
1. Civilization Bonuses: Begin in the Tang Dynasty - Landmark costs are reduced by -15% and the Village is unlocked. | Enter a new Dynasty by building both Landmarks from an Age to unlock special bonuses and buildings. | Units trained, technologies researched, and resources dropped off generate tax (Gold) that can be collected by Imperial Officials. | Unique technologies massively upgrade Imperial Officials, unlock new units and boost military units. | Early Palace Guards are available in the Feudal Age. | Access the Zhuge Nu and Grenadier without entering Dynasties. | Villagers construct defenses +50% faster and all other buildings +100% faster. | Chemistry technology granted for free in the Dark Age - Town Centers, Keeps, and Outposts use Handcannon Slits instead of Defensive Arrowslits. | Docks work +10% faster.
2. Great Dynasties: Start your journey in the Tang Dynasty - Landmark costs are reduced by -15% and the Village is unlocked. Construct both Landmarks in an Age to start Dynasties with special bonuses, unique buildings, and units. • Song: Wood cost of Economy and Population buildings is discounted by -30% - unlocks construction of the Granary. • Yuan: 10% discount on all units - unlocks construction of the Pagoda. • Ming: Unique Units deal +20% damage.
3. Taxes: Units trained, technologies researched, and resources dropped off generate tax (Gold) that can be collected by Imperial Officials. Unique administrative technologies from the Mount Lu Academy and Zhu Xi's Library vastly improve Imperial Officials.
4. Dynasty Units: Access the Zhuge Nu and the Grenadier without establishing dynasties. Landmarks can unlock powerful Shaolin Monks, Yuan Raiders, and Imperial Guards. Early Palace Guards can be trained in the Feudal Age.
5. Masters of Gunpowder: Begin the game with Chemistry technology granted for free - defensive buildings use Handcannon Slits over Defensive Arrowslits.
6. Rapid Fabrications: Villagers construct defenses +50% faster and all other buildings +100% faster. Docks work +10% faster.
7. Protect the Palace: Train Early Palace Guards in the Feudal Age (II) to protect the emperor.
8. Unique Units: Imperial Official: Use the Supervise ability to boost the production speed of research and military buildings by +150% - supervising economic buildings increases the amount of resources dropped off by Villagers by +20%. Zhuge Nu: Archer replacement. Light ranged infantry with a rapid burst attack effective vs. light units. Palace Guard: Man-at-Arms replacement. Heavy melee infantry that exchanges armor for move speed. Nest of Bees: Mangonel replacement. Siege engine that fires a barrage of rockets, doing area of effect damage. Grenadier: Light ranged gunpowder infantry that throws grenades dealing area of effect damage.
