# GameAI

GameAI is an AI-native game creation project built around Codex. It explores how coding agents can support end-to-end browser game development, from concept and worldbuilding to gameplay design, art direction, implementation, and iteration.

The repository currently contains four original browser game projects presented through the Codex Games hub: **Wulin Tavern**, **Soulmate**, **Star Fighter**, and **Journey Ludo**. Each game represents a different mood and design direction, while sharing the same broader goal: turning small creative ideas into playable AI-assisted game experiences.

Live hub: [Codex Games](https://g.ismayday.mobi/)

## Current Games

### Wulin Tavern

**Wulin Tavern** is a wuxia-themed tavern game focused on character encounters, shifting table dynamics, and AI-assisted dialogue.

Players enter a lively jianghu tavern where familiar martial arts heroes may share a drink, trade jokes, argue across the table, or spark a memorable scene. The project emphasizes atmosphere, character voice, and emergent conversational moments.

- Live: [Wulin Tavern](https://g.ismayday.mobi/tavern/)
- Focus: Wuxia atmosphere, tavern encounters, AI dialogue
- Source: [`Tavern/`](./Tavern/)

### Soulmate

**Soulmate** is a mobile-first companion experience built around chat, mood, time, and gentle interaction.

Players enter a private room, talk with a companion, tap photos, ask for a hug, or hear a quiet good night. The project focuses on emotional pacing, lightweight interaction, and a soft sense of presence.

- Live: [Soulmate](https://g.ismayday.mobi/soulmate)
- Focus: Companion interaction, mobile experience, emotional rhythm
- Source: [`soulmate/`](./soulmate/)

### Star Fighter

**Star Fighter** is a neon arcade shooter about movement, pressure, power-ups, and boss fights.

Players pilot a fighter through deep space, dodge incoming fire, collect upgrades, survive escalating enemy waves, and use Omega Blast when the battlefield becomes overwhelming. The project emphasizes immediate action, readable combat, and replayable arcade flow.

- Live: [Star Fighter](https://g.ismayday.mobi/star_fighter)
- Focus: Arcade action, boss pressure, power-up progression
- Source: [`star_fighter/`](./star_fighter/)

### Journey Ludo

**Journey Ludo** is a Q-style board game following the pilgrimage route of *Journey to the West*, built in Godot 4 and exported to the web.

Players pick one of four pilgrims — Sun Wukong, Zhu Bajie, Tang Seng, or Sha Seng — and race the other three AI opponents along a 72-tile rectangular spiral toward Vulture Peak at the center. Dice rolls trigger event tiles, character skills, shields, and knockbacks. The project emphasizes data-driven rules, reproducible randomness, and a full art and audio pass.

- Live: [Journey Ludo](https://g.ismayday.mobi/journey/)
- Focus: Board game rules, event systems, data-driven design
- Engine: Godot 4.x (GL Compatibility, HTML5 export)
- Source: [`journey/`](./journey/)

## Repository

| Path | Project |
|---|---|
| [`Tavern/`](./Tavern/) | Wulin Tavern (HTML5) |
| [`soulmate/`](./soulmate/) | Soulmate (HTML5) |
| [`star_fighter/`](./star_fighter/) | Star Fighter (HTML5) |
| [`journey/`](./journey/) | Journey Ludo (Godot 4) |
| [`garden/`](./garden/) | Garden Match (Phaser 3 + TS) — in development |
| [`index.html`](./index.html) | Codex Games hub page |
| [`scripts/`](./scripts/) | Shared deploy and utility scripts |

### Remotes

The project is mirrored across two Git remotes:

| Remote | Role | Branch |
|---|---|---|
| `origin` | Primary — [github.com/kevinchenkai/GameAI](https://github.com/kevinchenkai/GameAI) | `main` |
| `ezone` | Backup mirror (internal) | `master` |

Day-to-day work is pushed to `origin`; the backup mirror is updated with `git push ezone main:master`.

## Notes

More games and experiments are on the way.

