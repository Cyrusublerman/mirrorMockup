export function occupancy(tl, br) {
  return Math.abs((br[0] - tl[0]) * (br[1] - tl[1]));
}
