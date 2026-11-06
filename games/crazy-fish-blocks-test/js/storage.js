(function(root){"use strict";function getBackend(injected){if(injected)return injected;try{var ls=root.localStorage;var probe="webstudio:__probe__";ls.setItem(probe,"1");ls.removeItem(probe);return ls;}catch(e){return null;}}
function clone(v){return JSON.parse(JSON.stringify(v));}
function createSaveStore(options){if(!options||!options.gameId||!(options.version>=1))throw new Error("gameId en version zijn verplicht");var gameId=String(options.gameId),version=options.version|0;var defaults=options.defaults,validate=options.validate;var migrate=options.migrate||null;var backend=getBackend(options.backend);var memory=null;var status=backend?"fresh":"unavailable";function keyFor(v){return"webstudio:"+gameId+":v"+v;}
var key=keyFor(version);function readParsed(k){var raw=backend.getItem(k);if(raw===null||raw===undefined)return{found:false};try{return{found:true,data:JSON.parse(raw)};}catch(e){return{found:true,corrupt:true};}}
function load(){if(!backend){return clone(memory||defaults);}
try{var cur=readParsed(key);if(cur.found){var clean=cur.corrupt?null:validate(cur.data);if(clean){status="ok";return clean;}
status="corrupt";return clone(defaults);}
if(migrate){for(var v=version-1;v>=1;v--){var old=readParsed(keyFor(v));if(old.found&&!old.corrupt){var moved=null;try{moved=migrate(old.data,v);}catch(e2){moved=null;}
var ok=moved?validate(moved):null;if(ok){status="migrated";return ok;}}}}
status="fresh";return clone(defaults);}catch(e){backend=null;status="unavailable";return clone(memory||defaults);}}
function save(data){memory=clone(data);if(!backend)return false;try{backend.setItem(key,JSON.stringify(data));if(status==="corrupt"||status==="fresh"||status==="write-failed")status="ok";return true;}catch(e){status="write-failed";return false;}}
function reset(){memory=null;if(backend){try{backend.removeItem(key);}catch(e){}}
status=backend?"fresh":"unavailable";return clone(defaults);}
return{key:key,load:load,save:save,reset:reset,getStatus:function(){return status;}};}
var api={createSaveStore:createSaveStore};root.WS=root.WS||{};root.WS.storage=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;})(typeof window!=="undefined"?window:globalThis);