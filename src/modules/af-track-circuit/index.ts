import type { RailModule } from "../types";
import "./af.css";
import { mountSim } from "./sim";
import { mountWhy } from "./why";
import { mountLines } from "./lines";
import { mountBond } from "./bond";
import { mountSummary } from "./summary";

export const afTrackCircuit: RailModule = {
  id: "af-track-circuit",
  titleKey: "mod.af.title",
  descKey: "mod.af.desc",
  level: "beginner",
  pages: [
    { titleKey: "mod.af.p1.title", mount: mountSim },
    { titleKey: "mod.af.p2.title", mount: mountWhy },
    { titleKey: "mod.af.p3.title", mount: mountLines },
    { titleKey: "mod.af.p4.title", mount: mountBond },
    { titleKey: "mod.af.p5.title", mount: mountSummary },
  ],
};
