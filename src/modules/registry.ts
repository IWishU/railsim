import type { PlannedModule, RailModule } from "./types";
import { afTrackCircuit } from "./af-track-circuit";

export const modules: RailModule[] = [afTrackCircuit];

export const planned: PlannedModule[] = [
  { id: "signal-block", titleKey: "mod.signal.title", descKey: "mod.signal.desc" },
  { id: "switch", titleKey: "mod.switch.title", descKey: "mod.switch.desc" },
  { id: "power", titleKey: "mod.power.title", descKey: "mod.power.desc" },
];
