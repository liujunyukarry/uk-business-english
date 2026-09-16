// One shared bound cycle drives paws, ears and contact effects. The lift is
// visual only: collecting and collision continue to use the player's feet.
export function sprintMotion(t) {
 const phase=t*17, wave=Math.sin(phase), lift=Math.max(0,wave);
 return {phase, lift:Math.pow(lift,.8), tuck:Math.sin(phase-.6),
  contact:Math.max(0,-wave), beat:Math.floor((phase-Math.PI)/(Math.PI*2))};
}
