"""Manifiesto de arte de MR- Wicked Ones (lote 3): mapas tácticos cenitales y banner de repositorio."""

TACTICOS = {
 "cueva-mercader": "a top-down tactical battlemap of a natural cave complex: a wide cave mouth with an overturned merchant wagon and crates, a guards' gallery, a stone storage vault, a cold underground stream with a pool, ruined ancient shrine with a glowing heart-shaped crystal, rocky walls",
 "guarida-1": "a top-down tactical battlemap of a small freshly-excavated monster lair on level one: rough carved tunnels, a central chamber with a glowing dark heart crystal on a pedestal, empty chambers ready to be built, torches on walls, bones and straw",
 "guarida-2": "a top-down tactical battlemap of a medium monster dungeon on level two: connected rooms with a forge, a barracks with bunks, a trap corridor with spikes, a treasure vault door, a glowing dark heart in the center, torches",
 "guarida-3": "a top-down tactical battlemap of a large monster fortress dungeon on level three: many rooms, a throne room, a ritual circle, an arena pit, deep trap corridors, barricades, lava channels, a glowing dark heart in the center",
}

def build():
    E = []
    for k, d in TACTICOS.items():
        E.append(dict(id=f"mapa-{k}", kind="map", w=1664, h=1152, prompt=f"{d}, seen from directly above, no characters, no text, no grid, hand-inked dungeon map with flat colors", prio=22))
    E.append(dict(id="esc-banner", kind="scene", w=1664, h=640, prompt="a wide banner scene: silhouettes of an orc, a goblin with goggles, a kobold shaman and a horned demon sorcerer on a ridge against a huge blood-red moon over a dark valley, title-card composition with empty space on the left", prio=23))
    return E
