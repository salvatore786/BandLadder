/**
 * The reusable plan geometry. Only the LABELS change between reels — every
 * reel that uses `kind: "map"` reuses these coordinates, so one JSON file is
 * enough to make a new listening walkthrough.
 *
 * All numbers are in the plan's own viewBox space (900 x 800).
 */
export const PLAN = {
  viewBox: {width: 900, height: 800},
  boundary: {x: 22, y: 26, w: 856, h: 712, r: 26},
  corridors: {
    top: {x: 44, y: 150, w: 812, h: 58},
    spine: {x: 412, y: 208, w: 76, h: 530},
  },
  entrance: {x: 450, y: 760},
  rooms: {
    topLeft: {x: 44, y: 226, w: 356, h: 113},
    topRight: {x: 500, y: 226, w: 356, h: 113},
    midLeft: {x: 44, y: 353, w: 356, h: 113},
    midRight: {x: 500, y: 353, w: 356, h: 181},
    lowLeft: {x: 44, y: 480, w: 356, h: 113},
    lowRight: {x: 500, y: 548, w: 356, h: 174},
    baseLeft: {x: 44, y: 607, w: 356, h: 115},
  },
} as const;

export type SlotId = keyof typeof PLAN.rooms;
export const SLOT_ORDER = Object.keys(PLAN.rooms) as SlotId[];

/** Centre of a slot, normalised 0-1 within the plan — for arrows and tooltips. */
export const slotCentre = (slot: SlotId) => {
  const r = PLAN.rooms[slot];
  return {
    x: (r.x + r.w / 2) / PLAN.viewBox.width,
    y: (r.y + r.h / 2) / PLAN.viewBox.height,
  };
};

/** A rounded-rectangle path, so the outline can draw itself on with evolvePath. */
export const roundedRectPath = (
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + rr} ${y}`,
    `H ${x + w - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr}`,
    `V ${y + h - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}`,
    `H ${x + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr}`,
    `V ${y + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + rr} ${y}`,
    'Z',
  ].join(' ');
};
