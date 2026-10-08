import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const app=fs.readFileSync('dist/app.js','utf8');
const context=vm.createContext({state:{testMode:false,foodAllergies:[]}});
vm.runInContext(fs.readFileSync('dist/products.js','utf8')+'\n'+app.slice(0,app.indexOf('const ICONS=')),context);
const read=expression=>JSON.parse(vm.runInContext(`JSON.stringify(${expression})`,context));
const result=[];
function check(name,actual,expected){assert.deepEqual(actual,expected,name);result.push({name,actual});}
const records=read('PRODUCTS');
check('실제 상품 7개',records.length,7);
check('함유·제조환경 모두 확인 6개',read('PRODUCTS.filter(hasEvidence).length'),6);
check('맛밤 제조환경 미확인',records.find(p=>p.id==='p01').facilityStatus,'UNKNOWN');
for(const p of records){assert.equal(new URL(p.sourceUrl).hostname,'www.kurly.com');assert.ok(p.labelUrl);assert.equal(p.checkedAt,'2026-10-08');assert.ok(/\d+g/.test(p.name));}
check('포테토칩 실제 직접 함유',records.find(p=>p.id==='p03').direct,['대두']);
check('포카칩 표시 함유',records.find(p=>p.id==='p02').direct,['우유','대두']);
check('새우깡 표시 함유',records.find(p=>p.id==='real-shrimp-90').direct,['밀','새우','대두','우유']);
check('미등록 시 맛밤 제외',read('recommendationCandidates().map(p=>p.id)'),records.filter(p=>p.id!=='p01').map(p=>p.id));
context.state.foodAllergies=['복숭아'];
check('복숭아 저장: 제조환경 제외 후 두 후보',read('recommendationCandidates().map(p=>p.id)'),['p03','real-shrimp-90']);
context.state.foodAllergies=['우유'];
check('우유 저장: 직접 함유 5개와 제조환경 1개 제외',read('recommendationCandidates().length'),0);
context.state.foodAllergies=['메밀'];
check('메밀 저장: 해당 표시 없는 후보 6개',read('recommendationCandidates().length'),6);
check('밀 제외 과자: 직접 함유·제조환경 모두 제외',read('searchProducts("밀 없는 과자").items.length'),0);
check('새우 제외 과자: 직접 함유·제조환경 모두 제외',read('searchProducts("제외: 새우 과자").items.length'),0);
check('밀 제외 전체: 맛밤은 충족 미확인으로 별도 남김',read('searchProducts("밀 없는 간식").items.map(p=>p.id)'),['p01']);
check('포카칩 이름 검색',read('searchProducts("포카칩").items.map(p=>p.id)'),['p02']);
check('검색 빈 결과',read('searchProducts("없는제품명XYZ").items.length'),0);
context.state.testMode=true;context.state.foodAllergies=['밀','새우'];
check('별도 가상 모드 유지',read('recommendationCandidates().length'),17);
check('가상 22개 실제 상품 혼입 없음',read('catalog().every(p=>p.isTest)'),true);
fs.mkdirSync('artifacts/qa',{recursive:true});fs.writeFileSync('artifacts/qa/real-data-logic.json',JSON.stringify({checks:result.length,results:result},null,2));
console.log(`${result.length}개 실제 데이터·필터 검증 통과`);
