import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/hjlee/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = 'http://127.0.0.1:4173/';
const allergens = ['난류','우유','메밀','땅콩','대두','밀','고등어','게','새우','돼지고기','복숭아','토마토','아황산류','호두','닭고기','쇠고기','오징어','조개류','잣'];
const allKnown = [...allergens.map((_,i)=>`test-direct-${i}`),'test-facility-wheat','test-facility-shrimp'];
const realIds=['p01','p02','p03','real-sun-48','real-turtle-49','real-ohgamja-35','real-shrimp-90','real-potatosnack-250','real-honeytwist-300','real-spicyshrimp-400','real-squid-260','real-jagalchi-300','real-ricesnack-320','real-postick-280','real-doctor-energy-40','real-doctor-protein-50','real-chocopie-468','real-pocari-1500','real-barley-500','real-selex-nuts-50'];
const key = 'meogeodoDwaePrototypeV3';
const checks = [], errors = [];
function check(name, actual, expected) { assert.deepEqual(actual, expected, name); checks.push(name); }
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
  page.on('response', r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key})=>{if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({loggedIn:true,account:{displayName:'검증 사용자',email:'test@local.example'},foodAllergies:[],drugReactions:[],searchQuery:'과자',category:'전체',profileTab:'food',selectedProductId:'p01'}));},{key});
  async function go(route){await page.goto(`${base}#${route}`);await page.locator('#app h1').first().waitFor();}
  async function ids(selector){return (await page.locator(selector).evaluateAll(nodes=>nodes.map(n=>n.dataset.product))).sort();}
  async function saveAllergies(selected){
    await go('profile');
    await page.getByRole('button',{name:'식품 알레르기',exact:true}).click();
    for(const a of allergens){const label=page.locator('.allergen-grid label').filter({has:page.locator(`input[value="${a}"]`)});if(await label.locator('input').isChecked()!==selected.includes(a))await label.click();}
    await page.getByRole('button',{name:'선택 항목 저장',exact:true}).click();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).foodAllergies,key);
    check(`UI 저장: ${selected.join('·')||'없음'}`,saved,[...selected].sort((a,b)=>allergens.indexOf(a)-allergens.indexOf(b)));
    await go('home');
  }
  async function fullRecommendationIds(){
    if(await page.locator('.recommendation-all').count()===0)return [];
    await page.locator('.recommendation-all').click();
    await page.getByRole('heading',{name:'알레르기 기준 추천 후보',exact:true}).waitFor();
    const result=await ids('.rec-list [data-product]');
    await page.getByRole('button',{name:'이전 화면',exact:true}).click();
    await page.getByRole('heading',{name:'오늘 먹을 간식, 표시부터 확인해보세요.',exact:true}).waitFor();
    return result;
  }
  async function search(q){await page.getByRole('textbox',{name:'제품 검색',exact:true}).fill(q);await page.locator('#searchForm button').click();await page.getByRole('heading',{name:'검색 결과',exact:true}).waitFor();}
  await go('home');
  check('실제 상품 추천: 미확인 2개 제외',await fullRecommendationIds(),realIds.filter(id=>!['p01','real-pocari-1500'].includes(id)).sort());
  await go('all-products');
  check('실제 상품 20개',await page.locator('.product-list [data-product]').count(),20);
  check('제조환경 미확인 2개',await page.locator('.badge.unknown').count(),2);
  await page.locator('[data-product="p03"]').click();
  await page.getByRole('heading',{name:'제품 근거·상세',exact:true}).waitFor();
  check('포테토칩 실제 직접 함유 표시',(await page.locator('#app').innerText()).includes('대두 함유'),true);
  check('상품 출처 링크',await page.getByRole('link',{name:'컬리 상품 상세 열기 ↗'}).getAttribute('href'),'https://www.kurly.com/goods/1002129073');
  await go('home');
  await page.getByLabel('가상 테스트 상품 보기',{exact:true}).check();
  check('홈 추천 최대 3개',await page.locator('.rec-list [data-product]').count(),3);
  check('홈 추천 공통 안내 1회',await page.locator('.recommendation-notice').count(),1);
  check('추천 카드 반복 설명 제거',await page.locator('.rec-list .product p').count(),0);
  check('가상 모드 추천 기준선 21개',await fullRecommendationIds(),[...allKnown].sort());
  check('미확인 테스트 상품 추천 제외',await page.locator('.rec-list [data-product="test-unknown"]').count(),0);
  check('모든 추천명에 가상 테스트 상품 표기',await page.locator('.rec-list .product h3').evaluateAll(ns=>ns.every(n=>n.textContent.includes('가상 테스트 상품'))),true);
  for(let i=0;i<allergens.length;i++){
    const a=allergens[i];await saveAllergies([a]);
    const excluded=[`test-direct-${i}`,...(a==='밀'?['test-facility-wheat']:a==='새우'?['test-facility-shrimp']:[])];
    check(`19종 추천 필터: ${a}`,await fullRecommendationIds(),allKnown.filter(id=>!excluded.includes(id)).sort());
  }
  await saveAllergies(['밀','새우']);
  check('복수 선택 추천: 17개',Number(await page.locator('[data-rec-count]').innerText()),17);
  await page.reload();
  check('새로고침: 저장 알레르기 유지',await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).foodAllergies,key),['밀','새우']);
  check('새로고침: 가상 모드 유지',await page.getByLabel('가상 테스트 상품 보기').isChecked(),true);
  check('새로고침: 추천 유지',Number(await page.locator('[data-rec-count]').innerText()),17);
  await search('과자');
  check('검색 저장 항목 경고 별도 표시',await ids('[data-result-group="warnings"] [data-product]'),['test-direct-5','test-direct-8','test-facility-shrimp','test-facility-wheat'].sort());
  check('제조환경 경고 상태 표기',await page.locator('[data-result-group="warnings"] .badge.warn').count(),2);
  check('직접 함유 상태 표기',await page.locator('[data-result-group="warnings"] .badge.danger').count(),2);
  check('정보 미확인 별도 영역',await ids('[data-result-group="unknown"] [data-product]'),['test-unknown']);
  const snackKnown=allKnown.filter(id=>!['test-direct-1','test-direct-10','test-direct-13'].includes(id));
  const excluded4=['test-direct-5','test-direct-8','test-facility-wheat','test-facility-shrimp'];
  for(const q of ['밀·새우 없는 과자','제외: 밀·새우 과자','밀과 새우를 제외한 과자']){
    await search(q);
    check(`검색 제외 실제 적용: ${q}`,await ids('.result-group [data-product]'),[...snackKnown.filter(id=>!excluded4.includes(id)),'test-unknown'].sort());
    check(`두 제외 조건 표기: ${q}`,await page.locator('.chip.selected').filter({hasText:'제외:'}).count(),2);
  }
  await page.reload();
  check('새로고침: 검색어 유지',await page.getByRole('textbox',{name:'제품 검색'}).inputValue(),'밀과 새우를 제외한 과자');
  check('새로고침: 검색 결과 유지',await page.locator('.result-group [data-product]').count(),15);
  await search('밀가루 안 들어간 간식 찾아줘');
  check('밀가루 별칭과 제외 문구 적용',await ids('.result-group [data-product]'),[...allKnown.filter(id=>!['test-direct-5','test-facility-wheat'].includes(id)),'test-unknown'].sort());
  await search('밀 표시 없는 간식');
  check('빠른 검색 문구 적용',await page.locator('.chip.selected').filter({hasText:'제외: 밀'}).count(),1);
  await search('우유');
  check('단순 함유 언급을 제외로 오해하지 않음',await page.locator('.chip.selected').filter({hasText:'제외:'}).count(),0);
  check('이름 검색 적용',await ids('.result-group [data-product]'),['test-direct-1']);
  await search('존재하지않는테스트식품');
  check('검색 빈 결과 안내',await page.getByRole('heading',{name:'검색 결과가 없습니다',exact:true}).isVisible(),true);
  await page.getByRole('button',{name:'검색 조건 바꾸기'}).click();
  await saveAllergies(allergens);
  check('모든 항목 선택: 추천 빈 결과',await page.getByRole('heading',{name:'추천 후보가 없습니다',exact:true}).isVisible(),true);
  await saveAllergies([]);
  check('선택 해제: 추천 후보 복원',Number(await page.locator('[data-rec-count]').innerText()),21);
  for(let i=0;i<allergens.length;i++){
    const a=allergens[i];await search(`제외: ${a}`);
    const excluded=[`test-direct-${i}`,...(a==='밀'?['test-facility-wheat']:a==='새우'?['test-facility-shrimp']:[])];
    check(`19종 검색 제외: ${a}`,await ids('.result-group [data-product]'),[...allKnown.filter(id=>!excluded.includes(id)),'test-unknown'].sort());
  }
  await go('all-products');await page.locator('[data-category="기타"]').click();
  check('카테고리 빈 결과 안내',await page.getByRole('heading',{name:'이 카테고리에 상품이 없습니다'}).isVisible(),true);
  await page.getByRole('button',{name:'전체 보기',exact:true}).click();
  check('카테고리 초기화',await page.locator('.product-list [data-product]').count(),22);
  await page.getByLabel('가상 테스트 상품 보기').uncheck();
  check('일반 모드에 가상 상품 혼입 없음',await ids('.product-list [data-product]'),[...realIds].sort());
  await go('home');await search('밀 표시 없는 과자');
  check('실제 밀 직접 함유와 제조환경 모두 검색 제외',await ids('.result-group [data-product]'),[]);
  check('실제 미확인 상품을 비교 완료 영역으로 표시하지 않음',await page.locator('[data-result-group="compared"]').count(),0);
  await search('포카칩');check('실제 브랜드 이름 검색',await ids('.result-group [data-product]'),['p02']);
  await go('profile');await page.getByRole('button',{name:'약물·이상반응',exact:true}).click();
  check('약물 화면 ID 보존',await page.locator('#screenCode').innerText(),'SCR-MY-002');
  await page.locator('#drugName').fill('검증용 약물 기록');await page.locator('#symptom').fill('검증용 증상');await page.locator('#reactionType').selectOption('UNKNOWN');await page.getByRole('button',{name:'기록 추가',exact:true}).click();
  check('약물 기록 추가 유지',await page.getByText('검증용 약물 기록',{exact:true}).isVisible(),true);
  await page.getByRole('button',{name:'삭제',exact:true}).click();check('약물 기록 삭제 유지',await page.getByText('검증용 약물 기록',{exact:true}).count(),0);
  await go('card');check('카드 참고 정보 고지 유지',(await page.locator('#app').innerText()).includes('공식 의료기록이나 진단서가 아닙니다'),true);
  await go('privacy');check('로컬 저장 고지 유지',(await page.locator('#app').innerText()).includes('서버 전송 및 제3자 제공이 없습니다'),true);
  for(const viewport of [{width:390,height:844},{width:1440,height:900},{width:320,height:700}]){
    await page.setViewportSize(viewport);
    for(const route of ['home','recommendations','all-products','results','detail','profile']){
      await go(route);
      check(`화면 폭: ${viewport.width} ${route}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('#app').scrollWidth<=document.querySelector('#app').clientWidth),true);
    }
  }
  await page.setViewportSize({width:390,height:844});await go('home');await page.getByLabel('가상 테스트 상품 보기').check();await saveAllergies(['밀','새우']);
  mkdirSync('artifacts/qa',{recursive:true});
  await page.screenshot({path:'artifacts/qa/recommend-mobile.png'});
  await search('과자');await page.screenshot({path:'artifacts/qa/search-warnings-mobile.png'});
  await search('밀·새우 없는 과자');await page.screenshot({path:'artifacts/qa/search-exclusions-mobile.png'});
  await page.setViewportSize({width:1440,height:900});await page.screenshot({path:'artifacts/qa/search-desktop.png'});
  check('브라우저 실행 오류',errors,[]);
  writeFileSync('artifacts/qa/results.json',JSON.stringify({status:'passed',checkedAt:new Date().toISOString(),checks,errors,viewports:['390x844','1440x900','320x700']},null,2));
  console.log(JSON.stringify({status:'passed',checkCount:checks.length,errors,report:'artifacts/qa/results.json'}));
} finally {await browser.close();}
