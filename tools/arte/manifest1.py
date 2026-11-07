"""Manifiesto de arte de MR- Wicked Ones (lote 1): PJ, escenas, aventureros, dioses, esbirros, criaturas.
Cada entrada: id, kind, w, h, prompt, prio. El estilo común se añade en generar.py según el kind."""

# --- Aventureros (30 clases del libro): descripción visual en inglés ------------------------------------
AVENTUREROS = {
 "academico": "a scholar adventurer in long robes with round spectacles, carrying a thick tome and a satchel of scrolls",
 "alquimista": "an alchemist adventurer with a leather apron, a bandolier of colorful glass flasks and a respirator mask",
 "amazona": "an amazon warrior woman with a spear and round shield, bronze armor, braided hair",
 "aristocrata": "an arrogant aristocrat duelist in an embroidered coat and feathered hat, holding a rapier",
 "asesino": "a hooded assassin with a dark cloth mask and two curved daggers, crouching",
 "barbaro": "a huge barbarian with a fur cloak, a great two-handed axe, war paint and a horned helmet",
 "bardo": "a flamboyant bard with a feathered hat, playing a lute, a rapier at his hip",
 "bucanero": "a swashbuckling buccaneer pirate with a tricorn hat, cutlass, flintlock pistol and striped sash",
 "centurion": "a centurion with a crested helmet, segmented plate armor, short sword and tower shield",
 "mago-del-caos": "a chaos mage with wild hair, robes covered in glowing runes, swirling multicolored energy around a crooked staff",
 "clerigo": "a cleric with a flanged mace and a holy symbol, white tabard over chainmail",
 "caballero-de-la-muerte": "a death knight in black spiked plate armor with a skull-faced helm, glowing blue eyes and a cursed greatsword",
 "defensor": "a defender in heavy plate armor with a massive tower shield and a war hammer",
 "druida": "a druid with an antler crown, a gnarled wooden staff and a robe of moss and leaves",
 "guerrero-sobrenatural": "a supernatural warrior with glowing spectral tattoos wielding two ghostly blades",
 "ilusionista": "an illusionist wearing a masquerade mask and a shimmering mirror-like cloak, smoke curling from the hands",
 "inquisidor": "a grim inquisitor in a black wide-brim hat and long coat, carrying a torch and an iron cross",
 "caballero": "a knight in shining plate armor with a longsword and a heraldic shield",
 "lancero": "a lancer with a long lance with pennant, light armor and a buckler",
 "cazador-de-magos": "a mage hunter in a long grim coat with anti-magic iron chains and a heavy crossbow",
 "monje": "a barefoot monk in simple robes with wrapped fists in a martial arts stance",
 "asesino-de-lo-oculto": "an occult slayer with a wide hat and long duster coat, silver stakes, a bandolier of holy water vials",
 "guardabosques": "a ranger with a green hood, a longbow and a hawk perched on the arm",
 "explorador": "a dungeon scout with a leather satchel, a lantern, a coil of rope and a pickaxe",
 "bailarin-sombrio": "a slender shadow dancer with two curved daggers and long flowing dark scarves, mid-pirouette",
 "hondero": "a ragged slinger with a leather sling whirling and a pouch of stones",
 "arquero-arcano": "an arcane archer with an elegant bow drawing a glowing magical arrow",
 "templario": "a templar in a great helm and a white and red tabard, holding a sword wreathed in flame",
 "forjador-de-armas": "a weaponsmith with a huge blacksmith hammer, a scorched leather apron and an anvil sparking behind",
 "salvaje": "a wild savage hunter with bone spears, feathers, face paint and an animal pelt",
}

# --- PJ pregenerados -------------------------------------------------------------------------------------
PJS = {
 "ulrot": "a hulking orc brute with scarred green skin, tusks, heavy iron-plated armor and a notched great axe",
 "crag": "a small red-scaled kobold shaman with a bone mask, a feathered staff and a pouch of components",
 "slem": "a lithe serpent-folk shadow with vertical golden eyes, scaled skin, a dark hooded cloak and a curved dagger",
 "viska": "a goblin woman crafter with brass goggles, soot-stained fingers, a big wrench and a bandolier of tools",
 "kaelen": "a demon sorcerer with curved horns, crimson robes, ember-glowing eyes and a burning censer",
 "zira": "a tentacle-faced psychic mind-eater schemer disguised in pilgrim robes with dark lenses and hidden daggers",
}

# --- Esbirros: manada de cuatro ---------------------------------------------------------------------------
ESBIRROS = {
 "ulrot": "a group of four orc guards and shield-breakers with notched axes, iron shields and looted armor",
 "crag": "a group of four kobold tunnel shamans and trappers with feathered javelins, bone masks and component pouches",
 "slem": "a group of four serpent-folk night scouts and assassins in dark capes with poisoned daggers and blowguns",
 "viska": "a group of four goblin engineers and miners with brass goggles, wrenches, picks and powder kegs",
 "kaelen": "a group of four demon cultists in crimson robes with burning censers and curved swords",
 "zira": "a group of four tentacle-faced spies disguised as pilgrims with dark lenses and hidden daggers",
}

# --- Dioses oscuros --------------------------------------------------------------------------------------
DIOSES = {
 "gorlag": "Gorlag the Lord of Slaughter, a colossal bloodsoaked war god with a horned skull helm and a cleaver, rivers of blood",
 "iziza": "Iziza the Queen of Swarms, an insectoid goddess with chitin armor, many arms and clouds of insects and webs",
 "melkahar": "Melkahar the Heart of the Burning Forge, a molten magma giant with a glowing furnace chest and an anvil",
 "gimosha": "Gimosha the Silence of the Crypt, a pale skeletal robed figure with cold mist and a crown of bones",
 "dalgeth": "Dalgeth the Weaver of Lies, a faceless masked trickster with many mirrors and puppet strings",
 "nezame": "Nezame the Lady of Shadows, a slender woman made of living darkness with a thin knife and no light around her",
 "melawa": "Melawa the Mother of Mud and Rot, a bloated swamp mother covered in mushrooms and dripping acid",
 "shabaz": "Shabaz the Eye of the Storm, a giant eye amid a hurricane with lightning bolts and a robed figure",
 "labisha": "Labisha the Mistress of Exquisite Pain, an elegant tormentor in spiked leather wrapped in chains",
 "talazar": "Talazar the Architect of the Labyrinth, a stone-skinned figure holding drafting compasses over an impossible maze",
 "crevis": "Crevis the Insatiable Hunger, a huge many-toothed beast-god with a gaping maw and a feast table",
 "vahoona": "Vahoona the Whisper of the Void, an eldritch cosmic horror of black stars, gravity-warped tentacles and a portal",
 "zaheen": "Zaheen the Prince of Avarice, an ornate golden-skinned tyrant on a throne of coins and cursed contracts",
}

# --- Criaturas de guarida (36): id -> descripción ----------------------------------------------------------
CRIATURAS = {
 "n1-ciempies": "a giant cave centipede", "n1-aranas": "shadow-weaving cave spiders", "n1-cubo": "a gelatinous cube with a skeleton inside",
 "n1-hongos": "screaming mushrooms releasing spores", "n1-estriges": "a flock of strixes, bat-winged bloodsuckers", "n1-babosa": "a giant acid slug of the caves",
 "n1-huargos": "a pack of hungry dire wolves", "n1-ratas": "a swarm of crypt rats", "n1-serpiente": "an albino constrictor snake in a cave",
 "n1-escorpion": "a stone-armored giant scorpion", "n1-murcielagos": "giant vampire bats", "n1-esqueletos": "reanimated skeleton warriors",
 "n2-osolechuza": "an enraged owlbear", "n2-troll": "a regenerating cave troll", "n2-basilisco": "a basilisk with a petrifying gaze",
 "n2-mimico": "a mimic monster pretending to be a treasure chest", "n2-manticora": "a manticore with a spiked tail", "n2-golem-carne": "a stitched flesh golem",
 "n2-sombra": "a heat-devouring shadow creature", "n2-gusano": "a paralyzing carrion crawler worm", "n2-arpia": "a harpy of the cliffs",
 "n2-barro": "a boiling mud elemental", "n2-sabueso": "a fire-spitting hellhound", "n2-fungico": "a spore-spewing fungal abomination",
 "n3-hidra": "a five-headed pit hydra", "n3-golem-hierro": "a runic iron golem", "n3-dragon": "a young cavern dragon wyrmling",
 "n3-purpura": "a burrowing purple worm", "n3-demonio": "a chained abyssal demon", "n3-behir": "a lightning behir serpent",
 "n3-quimera": "a three-headed chimera", "n3-vampiro": "an ancient vampire lord in torpor on a coffin", "n3-tentaculos": "a tentacled horror of the abyss",
 "n3-caballero-espectral": "a spectral death knight", "n3-gigante": "a blind stone giant", "n3-pesadilla": "a will-o-wisp fire nightmare horse",
}

ESC = {
 "portada": "a band of monster villains (an orc, a goblin with goggles, a kobold shaman, a demon sorcerer) standing at the mouth of a torch-lit cave overlooking a quiet green valley at dusk, title-card composition, epic",
 "cueva-mercaderes": "a merchant caravan ambushed at a mountain pass cave entrance by goblins and orcs, overturned wagon, crates spilling, night, torchlight",
 "biblioteca-abadia": "monsters sneaking into a gothic abbey library with towering bookshelves and candles, a monk asleep, shelves ablaze with glowing tomes",
 "ritual-luna-llena": "a dark ritual in a forest clearing under a huge full moon, a demon sorcerer and a kobold shaman around a stone altar with a wolf pelt, green flames",
 "defensa-mazmorra": "monsters defending their underground lair from invading armored heroes, a barricaded tunnel with spikes, chaos and torchlight",
 "consejo-guerra": "a council of war among monster warlords around a table covered with a map in a torch-lit cavern, plotting an invasion",
 "batalla-santuario": "a final climactic battle at a moonlit hilltop sanctuary, a monster horde charging up the steps against defenders of light, banners and fire",
 "sala-del-trono": "a monstrous throne room carved into the rock with a huge skull throne, braziers, trophy banners and kneeling goblin servants",
 "excavacion": "goblin miners and orc laborers excavating a new tunnel in the rock, pickaxes, carts of rubble, lanterns, a glowing vein of gold",
 "taller-alquimia": "a cluttered goblin alchemy and gadget workshop with bubbling flasks, gears, steaming pipes and sparks",
 "cripta-hallazgo": "an ancient forgotten crypt discovered underground with sarcophagi, glowing runes and cobwebs",
 "banquete": "a rowdy monster feast in a great hall with roasted meat, tankards and a brawl breaking out",
 "incursion-aventureros": "a party of heroic adventurers (knight, mage, archer) entering a dark dungeon corridor full of traps, torch held high",
}
MAPAS = {
 "valle": "a fantasy region map seen from above: a silent green valley with a winding river, a walled flower city, a white stone abbey on hills, a dark forest, copper peaks, a mountain pass with caves, bridges and villages",
 "cloacas": "a fantasy map seen from above of a huge walled city and its tunnels: dense rooftops, a canal ring, a cathedral, a harbor, a keep, and sewer outlets",
 "mares": "a fantasy map seen from above of a colonial archipelago: tropical islands, reefs, a pirate cove, a fort, a volcano, galleons and a swirling abyss",
 "guerra": "a fantasy map seen from above of a war-torn frontier: trenches, siege camps, ruined villages, a river with a fort, burned fields, a mountain citadel",
}

def build():
    E = []
    def add(id, kind, w, h, prompt, prio, **kw):
        E.append(dict(id=id, kind=kind, w=w, h=h, prompt=prompt, prio=prio, **kw))
    for k, d in PJS.items():
        add(f"pj-{k}-fig", "fig", 768, 1024, f"full body character concept, {d}, standing heroic pose, centered, plain white background", 10)
        add(f"pj-{k}-bust", "bust", 768, 768, f"head and shoulders portrait of {d}, centered, plain warm cream background", 10)
    for k, d in ESC.items():
        add(f"esc-{k}", "scene", 1664, 960, f"{d}, wide cinematic dark fantasy scene", 20)
    for k, d in MAPAS.items():
        add(f"mapa-{k}", "map", 1664, 960, f"{d}, hand-inked illustrated cartography, aged parchment, no labels, no text, no letters", 21)
    for k, d in AVENTUREROS.items():
        add(f"adv-{k}-fig", "fig", 768, 1024, f"full body character concept, {d}, dynamic heroic pose, centered, plain white background", 30)
        add(f"adv-{k}-bust", "bust", 768, 768, f"head and shoulders portrait of {d}, centered, plain warm cream background", 31)
    for k, d in DIOSES.items():
        add(f"dios-{k}", "god", 768, 1024, f"{d}, imposing full figure, dramatic composition, plain white background", 40)
    for k, d in ESBIRROS.items():
        add(f"esb-{k}", "group", 1024, 768, f"{d}, standing together, centered, plain white background", 50)
    for k, d in CRIATURAS.items():
        add(f"cri-{k}", "creature", 640, 640, f"{d}, menacing, centered, plain warm cream background", 60)
    return E

if __name__ == "__main__":
    e = build(); print(len(e), "imágenes")
