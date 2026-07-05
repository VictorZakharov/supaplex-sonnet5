import { PALETTE } from "../render/palette";

export interface HintEntry {
  swatch: string;
  label: string;
  desc: string;
}

/** New mechanics introduced by each level, in LEVELS order. Only what's new — not a repeat of earlier hints. */
export const LEVEL_HINTS: readonly HintEntry[][] = [
  [
    { swatch: PALETTE.wall, label: "Wall", desc: "Solid. Blocks movement — rounded, so rocks resting on a narrow ledge of it roll off the edge." },
    { swatch: PALETTE.wallSquare, label: "Square Wall", desc: "Solid like Wall, but flat-edged — nothing rolls off it, even from a single-cell pedestal." },
    { swatch: PALETTE.base, label: "Base", desc: "Diggable dirt — walk into it to clear a path through." },
    { swatch: PALETTE.infotron, label: "Infotron", desc: "Collect every one on the level to unlock the Exit." },
    { swatch: PALETTE.exitClosed, label: "Exit", desc: "Opens once all Infotrons are collected." },
    {
      swatch: PALETTE.hudText,
      label: "Space + Direction",
      desc: "Act on the adjacent cell without stepping into it — collect an Infotron or clear a dirt tile in place.",
    },
  ],
  [
    {
      swatch: PALETTE.zonk,
      label: "Zonk",
      desc: "Falls when unsupported, rolls off rounded ledges, and can be pushed sideways. One landing on Murphy is fatal.",
    },
  ],
  [
    { swatch: PALETTE.orangeDisk, label: "Orange Disk", desc: "Pushable like a Zonk, but ignores gravity — it never falls." },
    { swatch: PALETTE.port, label: "Port", desc: "One-way gate. Approach from the right direction and you warp straight through to the other side." },
    {
      swatch: PALETTE.gravityPort,
      label: "Gravity Port",
      desc: "Like a Port, but also flips gravity for every loose object in the level.",
    },
  ],
  [
    {
      swatch: PALETTE.electron,
      label: "Bug + Electron",
      desc: "Electrons orbit their Bug forever. Deadly — though like the scissors it strikes a beat after cornering you, and a dodge reverses its orbit. Nothing shows the wind-up, so that's a gamble. Drop a Zonk on one and it detonates, filling the blast area with bonus Infotrons.",
    },
    {
      swatch: PALETTE.snikSnak,
      label: "Snik-Snak",
      desc: "Roams blade-first, forever hugging one wall — its route is fully predictable, and standing anywhere off it is safe. It strikes only when its own patrol steps into you, with a beat of wind-up: dodge it and it reverses, hugging the other wall. Destroyed by a falling object.",
    },
  ],
  [
    {
      swatch: PALETTE.generator,
      label: "Zonk Generator",
      desc: "Periodically spawns a fresh Zonk beneath itself — keep clear, or put the Zonks it makes to use.",
    },
    {
      swatch: PALETTE.bomb,
      label: "Impact Bomb",
      desc: "A square 3.5\" disk — pushable like a Zonk, but never rolls off a ledge. Harmless at rest, but explodes the instant it collides with something — landing after a fall, or having something else land on it.",
    },
    {
      swatch: PALETTE.bombArmed,
      label: "Bomb Pickup",
      desc: "A dormant bomb disk. Walk into it to add a timed bomb to your supply — you start with none.",
    },
    {
      swatch: PALETTE.fuseSpark,
      label: "Planting Bombs",
      desc: "Hold Space + a direction to plant in that cell, or Space alone to plant under your feet. Either way the charge takes a moment — keep holding until the ring completes, then run.",
    },
  ],
  [
    {
      swatch: PALETTE.gravityPort,
      label: "The Plug",
      desc: "Every mechanic returns. One Infotron hides behind a Zonk you can neither push nor dig around — but gravity works on Zonks, and you know a port that flips it.",
    },
    {
      swatch: PALETTE.infotron,
      label: "Electron Harvest",
      desc: "The Exit demands more Infotrons than the level contains. The Bug's Electron is the difference — crush it and collect the shower.",
    },
    {
      swatch: PALETTE.orangeDisk,
      label: "Rain Plug",
      desc: "The Generator rains Zonks over the bomb room's only doorway, and the pile will seal it before long. The Orange Disk ignores gravity — push it under the Generator's mouth and it hovers there, shutting the rain off for good.",
    },
  ],
];
