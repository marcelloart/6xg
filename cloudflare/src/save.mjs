import '../../assets/js/rts-engine.js';
import '../../assets/js/farm-engine.js';
const RESOURCES = ['wood', 'stone', 'gold', 'meat'];
const UNITS = ['soldier', 'archer', 'cavalry'];
const LEVELS = {
  barracks: [0, 3, 10], tower: [0, 3, 12], wall: [0, 3, 13],
  townhall: [1, 3, 18], lumber: [1, 4, 8], quarry: [1, 4, 8],
  mine: [1, 4, 9], hunt: [1, 4, 8]
};
const TRAINING = {soldier: 5, archer: 8, cavalry: 12};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value, low, high) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
export const integer = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
const require = condition => { if (!condition) throw new TypeError('Invalid game snapshot'); };
const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));

// Farm v5 also allows a bounded JPEG profile thumbnail (original upload stays local).
// Solo saves are bounded and whitelisted. They are not an authoritative PvP economy.
export function validateSave(save) {
  if ([4,5].includes(save?.version)) return globalThis.BaraFarm.validateSave(save);
  if (save?.version === 3) return globalThis.BaraRTS.validateSave(save);
  require(object(save) && save.version === 2 && object(save.state));
  const s = save.state, levels = s.levels;
  require(number(s.time, 0, 1e8) && object(levels));
  require(Object.keys(levels).sort().join(',') === Object.keys(LEVELS).sort().join(','));
  for (const [key, [low, high]] of Object.entries(LEVELS)) require(integer(levels[key], low, high));
  const cap = 500 + (levels.townhall - 1) * 200;
  const pop = 8 + (levels.townhall - 1) * 4;
  const armyCap = 16 + (levels.townhall - 1) * 4;
  const hp = 240 + (levels.townhall - 1) * 30 + levels.wall * 80;
  require(object(s.resources) && object(s.workers) && object(s.army));
  for (const key of RESOURCES) require(number(s.resources[key], 0, cap) && integer(s.workers[key], 0, pop));
  require(RESOURCES.reduce((sum, key) => sum + s.workers[key], 0) <= pop);
  const validArmy = army => object(army) && UNITS.every(key => integer(army[key], 0, armyCap));
  require(validArmy(s.army) && number(s.hp, 0, hp));
  require(Array.isArray(s.captured) && s.captured.length === 3 && s.captured.every(v => typeof v === 'boolean'));
  require(integer(s.wave, 0, 1000000) && number(s.raidTimer, 0, 150) && [null, 'won', 'lost'].includes(s.result));
  for (const field of ['construction', 'training', 'expedition', 'raid']) require(Object.hasOwn(s, field));
  const job = s.construction;
  if (job !== null) {
    require(object(job) && Object.hasOwn(LEVELS, job.key));
    const total = LEVELS[job.key][2] + levels[job.key] * 3;
    require(levels[job.key] < LEVELS[job.key][1] && job.total === total && number(job.left, 1e-9, total));
  }
  require(Array.isArray(s.training) && s.training.length <= 5);
  for (const task of s.training) require(object(task) && Object.hasOwn(TRAINING, task.key) && number(task.left, 1e-9, TRAINING[task.key]));
  const mission = s.expedition;
  let deployed = 0;
  if (mission !== null) {
    require(object(mission) && integer(mission.camp, 0, 2) && validArmy(mission.troops));
    require(number(mission.elapsed, 0, 29.999999999) && number(mission.power, 0, armyCap * 18));
    require(typeof mission.resolved === 'boolean' && typeof mission.won === 'boolean');
    deployed = UNITS.reduce((sum, key) => sum + mission.troops[key], 0);
  }
  require(UNITS.reduce((sum, key) => sum + s.army[key], 0) + deployed + s.training.length <= armyCap);
  const raid = s.raid;
  if (raid !== null) require(object(raid) && number(raid.left, 1e-9, 8) && raid.power === 34 + s.wave * 16);
  const clean = pick(s, ['time', 'hp', 'captured', 'wave', 'raidTimer', 'result']);
  clean.levels = pick(levels, Object.keys(LEVELS));
  clean.resources = pick(s.resources, RESOURCES);
  clean.workers = pick(s.workers, RESOURCES);
  clean.army = pick(s.army, UNITS);
  clean.construction = job ? pick(job, ['key', 'left', 'total']) : null;
  clean.training = s.training.map(task => pick(task, ['key', 'left']));
  clean.expedition = mission ? {...pick(mission, ['camp', 'elapsed', 'resolved', 'power', 'won']), troops: pick(mission.troops, UNITS)} : null;
  clean.raid = raid ? pick(raid, ['left', 'power']) : null;
  clean.log = Array.isArray(s.log) ? s.log.slice(0, 8).filter(e => object(e) && number(e.time, 0, 1e8) && typeof e.text === 'string').map(e => ({time: e.time, text: e.text.slice(0, 180)})) : [];
  return {version: 2, state: clean};
}
