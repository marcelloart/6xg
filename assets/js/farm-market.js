'use strict';
(function(root){
 const F=root.BaraFarm;
 const groups=Object.freeze({crop:F.CROPS,seed:F.CROPS,goods:F.RECIPES,animal:F.ANIMAL_PRODUCTS,fish:F.FISH,material:F.MATERIALS});
 const currencies=Object.freeze(['coins','idr','usd','crypto']);
 function catalog(){return Object.entries(groups).flatMap(([category,items])=>Object.entries(items).map(([item,spec])=>({category,item,name:spec.name,idName:spec.idName,icon:spec.icon,reference:category==='seed'||category==='material'?spec.price:spec.sell,bag:!['seed','material'].includes(category),limit:category==='seed'?1000:10000})));}
 function spec(category,item){return groups[category]&&Object.hasOwn(groups[category],item)?catalog().find(v=>v.category===category&&v.item===item):null;}
 function inventory(farm,category){return({crop:farm.s.produce,seed:farm.s.seeds,goods:farm.s.production.goods,animal:farm.s.livestock.produce,fish:farm.s.fishing.fish,material:farm.s.materials})[category];}
 function count(farm,category,item){return spec(category,item)?inventory(farm,category)[item]:0;}
 function receive(farm,category,item,qty){const v=spec(category,item);if(!v||!Number.isSafeInteger(qty)||qty<1)return false;const stock=inventory(farm,category);return stock[item]+qty<=v.limit&&(!v.bag||farm.used+qty<=farm.capacity);}
 root.FarmMarket=Object.freeze({groups,currencies,catalog,spec,inventory,count,receive,maxListings:20});
})(globalThis);
