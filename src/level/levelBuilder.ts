/** Index-based ASCII level painter — avoids error-prone manual character counting. */
export class LevelCanvas {
  private readonly grid: string[][];

  constructor(
    private readonly cols: number,
    private readonly rows: number,
    fill: string = " ",
  ) {
    this.grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
  }

  set(x: number, y: number, ch: string): this {
    this.grid[y]![x] = ch;
    return this;
  }

  hline(x1: number, x2: number, y: number, ch: string): this {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) this.set(x, y, ch);
    return this;
  }

  vline(x: number, y1: number, y2: number, ch: string): this {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) this.set(x, y, ch);
    return this;
  }

  border(ch: string = "#"): this {
    this.hline(0, this.cols - 1, 0, ch);
    this.hline(0, this.cols - 1, this.rows - 1, ch);
    this.vline(0, 0, this.rows - 1, ch);
    this.vline(this.cols - 1, 0, this.rows - 1, ch);
    return this;
  }

  toRows(): string[] {
    return this.grid.map((row) => row.join(""));
  }
}
