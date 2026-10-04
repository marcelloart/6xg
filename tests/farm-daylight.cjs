const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('assets/js/farm-daylight.js','utf8'),context);
const at=hour=>context.FarmDaylight.at(Date.parse('2026-10-04T'+String(hour).padStart(2,'0')+':00:00+07:00'));
assert.equal(at(0).clock,'00:00');assert.equal(at(23).clock,'23:00');
assert.equal(at(6).phase,'Fajar');assert.equal(at(12).phase,'Siang');assert.equal(at(18).phase,'Senja');assert.equal(at(21).phase,'Malam');
assert(at(6).sun.x>0&&at(18).sun.x<0,'Sunlight moves east to west');
assert(at(12).sun.y>at(8).sun.y,'The midday sun is higher than the morning sun');
assert.equal(at(12).daylight,1);assert.equal(at(0).daylight,0);assert.equal(at(0).sunIntensity,0);
assert(at(0).moonIntensity>0&&at(0).hemisphereIntensity>.4,'Night remains playable');
assert(at(6).golden>at(12).golden&&at(18).golden>at(12).golden,'Dawn and dusk receive warmer light');
const sameInstant=Date.parse('2026-10-04T05:00:00Z');assert.equal(context.FarmDaylight.at(sameInstant).clock,'12:00');
for(const hour of[5.5,7,17,18.5,24]){const stamp=Date.parse('2026-10-04T00:00:00+07:00')+hour*3600000;const a=context.FarmDaylight.at(stamp-1000),b=context.FarmDaylight.at(stamp+1000);for(const key of['daylight','sunIntensity','moonIntensity','environmentIntensity'])assert(Math.abs(a[key]-b[key])<.01,'No lighting jump at '+hour+': '+key);}
assert.equal(context.FarmDaylight.describe(at(12)),'Siang · 12:00 WIB (Jakarta)');
context.BaraI18n={t:s=>({'Siang':'Day'}[s]||s)};assert.equal(context.FarmDaylight.describe(at(12)),'Day · 12:00 WIB (Jakarta)');
console.log('Jakarta lighting checks passed: UTC+7, east/west sun, smooth transitions, readable night, and localized time.');
