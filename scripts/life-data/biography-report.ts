import {writeFileSync} from 'node:fs';
import {seededLife} from '../../artifacts/no-rules/src/game/seeded-life';
import {advanceTime,advance,availableActions,resolveChoice} from '../../artifacts/no-rules/src/game/simulation';
import {pendingDecision,canChoose} from '../../artifacts/no-rules/src/game/event-rules';
import {formatMoney,reconcile} from '../../artifacts/no-rules/src/game/finance';
let seed=0;for(;seed<10000;seed++){if(seededLife(seed,{countryCode:'AO'}).location.birthplace?.settlement==='Chongoroi')break;}
if(seed===10000)throw Error('No seeded Chongoroi birth found');
const life=seededLife(seed,{countryCode:'AO'});
for(let month=0;month<26*12;month++){
 if(month%6===0&&availableActions(life.age,life.stats).some(a=>a.id==='create'))advance(life,'create');else advanceTime(life);
 const e=pendingDecision(life);if(e)resolveChoice(life,e.id,e.choices!.findIndex((_,i)=>canChoose(life,e,i)));
}
if(!reconcile(life.simulation!))throw Error('Financial discrepancy');
const important=life.events.filter(e=>['birth','school-enrollment','school-pair','school-graduation','training-path','job-offer','project-ready','creative-path','career-review'].includes(e.templateId??'')||e.title.includes('подготовка')).reverse();
const lines=['# Фактическая биография: Chongoroi, Benguela','',`Seed ${seed}; ${life.character.name}; рождение ${life.birthDate}. Это результат настоящего генератора и движка, а не подготовленный сценарий.`,'',`Имена: уровень ${life.character.personalName?.selection}, язык ${life.character.personalName?.language}. Языковое происхождение не подтверждает местную этничность.`,''];
for(const e of important)lines.push(`- ${e.date}, ${e.age}: **${e.title}**. ${e.outcome??e.description} [ID: ${e.id}]`);
lines.push('',`Школа: ${life.simulation!.school!.status}, ${life.simulation!.school!.grade} классов. Курс: ${life.simulation!.development?.course?.title}.`,`Работа: ${life.simulation!.person.job.title}, ${life.simulation!.person.job.employer}; ${life.simulation!.person.job.schedule}.`,`Личные деньги: ${formatMoney(life,life.simulation!.person.money.cash)}; долг ${formatMoney(life,life.simulation!.person.money.debt)}. Счета сверены.`,`Проект: ${life.simulation!.development?.project?.title}, ${life.simulation!.development?.project?.progress}%.`,'','Работодатели и учреждения — игровые организации. Валюты и структурные параметры школы взяты из источников; цены, зарплаты, предметы и учебный календарь — модель.');
writeFileSync(new URL('../../artifacts/no-rules/docs/BIOGRAPHY_SAMPLE.md',import.meta.url),lines.join('\n')+'\n');console.log(`Biography generated from seed ${seed}`);
