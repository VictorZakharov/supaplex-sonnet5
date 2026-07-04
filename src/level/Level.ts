import { Point } from "../types";
import { Grid } from "../engine/Grid";

export interface ParsedLevel {
  grid: Grid;
  murphyStart: Point;
  infotronsRequired: number;
}
