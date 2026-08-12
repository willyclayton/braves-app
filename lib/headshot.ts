/** Official MLB headshot (Cloudinary). `d_` falls back to a generic silhouette. */
export function headshotUri(playerId: number, pixelSize = 80) {
  const w = Math.max(60, Math.round(pixelSize));
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${w},q_auto:best/v1/people/${playerId}/headshot/67/current`;
}
