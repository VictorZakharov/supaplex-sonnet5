import { LEVELS } from "../level/levels";
import { getLevelPreview } from "./levelPreviews";

/** Columns in the level-card grid — keyboard Up/Down jump by this much. */
export const MENU_CARD_COLS = 3;

/**
 * The start menu is a DOM overlay (not canvas-drawn) so the level cards get real CSS
 * transitions on hover/selection — see the .level-card rules in styles.css. Keyboard
 * navigation stays in Game (InputController events); this class just reflects the
 * selection and reports mouse picks back.
 */
export class StartMenu {
  private readonly root: HTMLElement;
  private readonly cards: HTMLElement[] = [];

  constructor(root: HTMLElement, onHover: (index: number) => void, onPick: (index: number) => void) {
    this.root = root;

    const title = document.createElement("h1");
    title.textContent = "SUPAPLEX";
    root.appendChild(title);

    const controls = document.createElement("div");
    controls.className = "menu-controls";
    for (const text of [
      "Arrow keys / WASD — move, dig, push, collect",
      "Hold Space (+ direction) — act in place / charge a bomb plant",
      "P — pause     R — restart level     Collect all Infotrons to open the Exit",
    ]) {
      const p = document.createElement("p");
      p.textContent = text;
      controls.appendChild(p);
    }
    root.appendChild(controls);

    const pick = document.createElement("p");
    pick.className = "menu-pick";
    pick.textContent = "Pick a level — click it, or arrows + Enter";
    root.appendChild(pick);

    const grid = document.createElement("div");
    grid.className = "menu-grid";
    LEVELS.forEach((level, i) => {
      const card = document.createElement("div");
      card.className = "level-card";

      const preview = getLevelPreview(i);
      preview.className = "level-preview";
      card.appendChild(preview);

      const name = document.createElement("span");
      name.className = "level-name";
      name.textContent = `${i + 1}. ${level.name}`;
      card.appendChild(name);

      // mousemove, not mouseenter: after a keyboard move steals the selection, any physical
      // mouse motion over a card must re-claim it — even if the cursor never left the card.
      card.addEventListener("mousemove", () => onHover(i));
      card.addEventListener("click", () => onPick(i));
      grid.appendChild(card);
      this.cards.push(card);
    });
    root.appendChild(grid);
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  setSelected(index: number): void {
    this.cards.forEach((card, i) => card.classList.toggle("selected", i === index));
  }
}
