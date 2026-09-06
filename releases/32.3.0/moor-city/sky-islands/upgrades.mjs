import {hash,ORES} from './rules.mjs';

export const PICKUP_RANGE_UPGRADE=Object.freeze({
 id:'pickupRange',
 name:'Pickup Range',
 baseMeters:6,
 metersPerLevel:2,
 maxLevel:6,
 // All values are multiples of $20 so iron ($1.25), copper ($2), crystal ($4)
 // and cash can represent the same underlying value with whole-number costs.
 dollarCosts:Object.freeze([20,40,80,160,320,640])
});

export const ORE_BAG_STORAGE_UPGRADE=Object.freeze({
 id:'oreBagStorage',
 name:'Ore Bag Storage',
 baseCapacity:240,
 capacityPerLevel:120,
 maxLevel:6,
 // Keep the same equivalent-value ladder as Pickup Range. The improvement is
 // larger per level because storage changes trip frequency rather than collection speed.
 dollarCosts:Object.freeze([20,40,80,160,320,640])
});

export const MOVEMENT_SPEED_UPGRADE=Object.freeze({
 id:'movementSpeed',
 name:'Movement Speed',
 baseMultiplier:1,
 multiplierPerLevel:.10,
 maxLevel:6,
 dollarCosts:Object.freeze([20,40,80,160,320,640])
});

export const TERMINAL_PAYMENT_ASSETS=Object.freeze(['cash','iron','copper','crystal']);
const ORE_VALUE=Object.freeze(Object.fromEntries(ORES.map(ore=>[ore.id,ore.price])));

export function normalizePickupRangeLevel(value){
 return Math.max(0,Math.min(PICKUP_RANGE_UPGRADE.maxLevel,Math.floor(Number(value)||0)));
}

export function pickupRangeMeters(level){
 return PICKUP_RANGE_UPGRADE.baseMeters+normalizePickupRangeLevel(level)*PICKUP_RANGE_UPGRADE.metersPerLevel;
}

export function pickupRangeDollarCost(level){
 const current=normalizePickupRangeLevel(level);
 return current>=PICKUP_RANGE_UPGRADE.maxLevel?null:PICKUP_RANGE_UPGRADE.dollarCosts[current];
}

export function normalizeOreBagStorageLevel(value){
 return Math.max(0,Math.min(ORE_BAG_STORAGE_UPGRADE.maxLevel,Math.floor(Number(value)||0)));
}

export function oreBagCapacity(level){
 return ORE_BAG_STORAGE_UPGRADE.baseCapacity+normalizeOreBagStorageLevel(level)*ORE_BAG_STORAGE_UPGRADE.capacityPerLevel;
}

export function oreBagStorageDollarCost(level){
 const current=normalizeOreBagStorageLevel(level);
 return current>=ORE_BAG_STORAGE_UPGRADE.maxLevel?null:ORE_BAG_STORAGE_UPGRADE.dollarCosts[current];
}

export function normalizeMovementSpeedLevel(value){
 return Math.max(0,Math.min(MOVEMENT_SPEED_UPGRADE.maxLevel,Math.floor(Number(value)||0)));
}
export function movementSpeedMultiplier(level){return MOVEMENT_SPEED_UPGRADE.baseMultiplier+normalizeMovementSpeedLevel(level)*MOVEMENT_SPEED_UPGRADE.multiplierPerLevel;}
export function movementSpeedPercent(level){return Math.round(movementSpeedMultiplier(level)*100);}
export function movementSpeedDollarCost(level){const current=normalizeMovementSpeedLevel(level);return current>=MOVEMENT_SPEED_UPGRADE.maxLevel?null:MOVEMENT_SPEED_UPGRADE.dollarCosts[current];}

export function terminalPaymentAsset(index,seed=0){
 const i=Math.max(0,Math.floor(Number(index)||0));
 return TERMINAL_PAYMENT_ASSETS[Math.floor(hash(i,771,seed)*TERMINAL_PAYMENT_ASSETS.length)%TERMINAL_PAYMENT_ASSETS.length];
}

export function paymentForDollarCost(asset,dollarCost){
 const value=asset==='cash'?1:ORE_VALUE[asset];
 if(!value)throw Error(`Unknown upgrade payment asset: ${asset}`);
 const dollars=Math.max(0,Number(dollarCost)||0);
 const amount=Math.ceil((dollars/value)-1e-9);
 return Object.freeze({asset,amount,dollarValue:amount*value,unitDollarValue:value});
}

export function pickupRangeOffer(level,asset){
 const current=normalizePickupRangeLevel(level),dollarCost=pickupRangeDollarCost(current);
 if(dollarCost===null)return Object.freeze({id:PICKUP_RANGE_UPGRADE.id,name:PICKUP_RANGE_UPGRADE.name,level:current,maxed:true,fromMeters:pickupRangeMeters(current),toMeters:pickupRangeMeters(current),dollarCost:null,payment:null});
 return Object.freeze({id:PICKUP_RANGE_UPGRADE.id,name:PICKUP_RANGE_UPGRADE.name,level:current,maxed:false,fromMeters:pickupRangeMeters(current),toMeters:pickupRangeMeters(current+1),dollarCost,payment:paymentForDollarCost(asset,dollarCost)});
}

export function oreBagStorageOffer(level,asset){
 const current=normalizeOreBagStorageLevel(level),dollarCost=oreBagStorageDollarCost(current);
 if(dollarCost===null)return Object.freeze({id:ORE_BAG_STORAGE_UPGRADE.id,name:ORE_BAG_STORAGE_UPGRADE.name,level:current,maxed:true,fromCapacity:oreBagCapacity(current),toCapacity:oreBagCapacity(current),dollarCost:null,payment:null});
 return Object.freeze({id:ORE_BAG_STORAGE_UPGRADE.id,name:ORE_BAG_STORAGE_UPGRADE.name,level:current,maxed:false,fromCapacity:oreBagCapacity(current),toCapacity:oreBagCapacity(current+1),dollarCost,payment:paymentForDollarCost(asset,dollarCost)});
}

export function movementSpeedOffer(level,asset){
 const current=normalizeMovementSpeedLevel(level),dollarCost=movementSpeedDollarCost(current);
 if(dollarCost===null)return Object.freeze({id:MOVEMENT_SPEED_UPGRADE.id,name:MOVEMENT_SPEED_UPGRADE.name,level:current,maxed:true,fromPercent:movementSpeedPercent(current),toPercent:movementSpeedPercent(current),dollarCost:null,payment:null});
 return Object.freeze({id:MOVEMENT_SPEED_UPGRADE.id,name:MOVEMENT_SPEED_UPGRADE.name,level:current,maxed:false,fromPercent:movementSpeedPercent(current),toPercent:movementSpeedPercent(current+1),dollarCost,payment:paymentForDollarCost(asset,dollarCost)});
}
if(typeof window!=='undefined')queueMicrotask(()=>import('./movement-speed-runtime.mjs').catch(error=>console.error('Movement speed upgrade runtime failed',error)));
