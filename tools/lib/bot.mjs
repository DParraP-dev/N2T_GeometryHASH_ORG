// A simple Hack Dash player that only looks at the screen, like a person.
//
// Each frame it finds the nearest ink pixel in front of the cube, estimates
// the world speed from how fast that distance shrinks, and holds the jump
// key when the obstacle is about three ticks away. It knows the layout of
// the game (cube columns and play-area rows), nothing about its memory.

import { pixel } from "./n2t.mjs";

const SPACE = 32;
const LOOKAHEAD = 110;

// Layout of HackDash (see Game.jack): cube is 16 px, floor starts at row 232,
// ceiling ends at row 21. Floor phases: cube at x 64..79, world moves left.
// Roof phases: cube at x 432..447, world moves right, colors inverted.
const FLOOR = { front: 80, step: 1, rows: [208, 231] };
const ROOF = { front: 431, step: -1, rows: [22, 45] };

function inverted(vm) {
  return pixel(vm, 300, 0); // row 0 is always background during play
}

function nearestInk(vm, lane, inv) {
  for (let d = 0; d < LOOKAHEAD; d++) {
    const x = lane.front + d * lane.step;
    for (let y = lane.rows[0]; y <= lane.rows[1]; y += 2) {
      if (pixel(vm, x, y) !== inv) return d;
    }
  }
  return null;
}

function gameOverVisible(vm) {
  // The game-over box has a 4 px frame at columns 136..139 and 372..375.
  const inv = inverted(vm);
  return pixel(vm, 137, 120) !== inv && pixel(vm, 374, 120) !== inv && pixel(vm, 145, 120) === inv;
}

export function createBot({ startFrame = 5 } = {}) {
  let prev = null;
  let speed = 4;
  let lastInv = false;
  const stats = { rounds: 0, portalsThisRound: 0, bestPortals: 0, roofSeen: false, deaths: 0 };
  let over = false;

  function input(vm, frame) {
    if (frame < startFrame) return 0;
    if (frame === startFrame) {
      stats.rounds = 1;
      return SPACE; // leave the title screen
    }
    if (gameOverVisible(vm)) {
      if (!over) {
        over = true;
        stats.deaths++;
      }
      // Release, then press to retry.
      return frame % 20 < 10 ? 0 : SPACE;
    }
    if (over) {
      over = false;
      stats.rounds++;
      stats.portalsThisRound = 0;
      lastInv = false;
      prev = null;
    }
    const inv = inverted(vm);
    if (inv !== lastInv) {
      stats.portalsThisRound++;
      stats.bestPortals = Math.max(stats.bestPortals, stats.portalsThisRound);
      lastInv = inv;
      prev = null;
    }
    if (inv) stats.roofSeen = true;
    const d = nearestInk(vm, inv ? ROOF : FLOOR, inv);
    if (d !== null && prev !== null && d < prev && prev - d <= 12) speed = prev - d;
    prev = d;
    return d !== null && d <= 3 * speed ? SPACE : 0;
  }

  return { input, stats };
}
