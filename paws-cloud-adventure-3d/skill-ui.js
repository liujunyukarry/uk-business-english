export function skillView(run) {
 const gold=run.character==='gold', active=run.powerTime>0;
 const state=active?'active':run.powerCooldown>0?'cooldown':'ready';
 const duration=gold?1.9:3.1, cooldown=gold?8:9;
 const name=gold?'飞扑破障':'泡泡守护';
 const detail=gold?'击碎障碍 · 吸骨头':active&&!run.powerShield?'盾已用完 · 仍吸骨头':'挡一次 · 吸骨头';
 const status=active?'生效 '+run.powerTime.toFixed(1)+'s':state==='cooldown'?'冷却 '+Math.ceil(run.powerCooldown)+'s':'点我释放';
 const progress=active?run.powerTime/duration:state==='cooldown'?1-run.powerCooldown/cooldown:1;
 return {state,name,detail,status,progress:Math.max(0,Math.min(1,progress)),gold,
  label:name+'，'+detail+'，'+status};
}
