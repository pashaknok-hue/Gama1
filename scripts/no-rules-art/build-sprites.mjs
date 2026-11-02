import {writeFileSync,mkdirSync,rmSync} from 'node:fs';import {spawnSync} from 'node:child_process';import path from 'node:path';
const game=path.resolve(import.meta.dirname,'../../artifacts/no-rules');
const palette={ink:'#233545',skin:'#d1a17d',hair:'#34313b',coat:'#cb6249',stripe:'#e8cd83',pants:'#4b6b70',shoe:'#25343b',eye:'#1d2930',chair:'#ab8260',blanket:'#809b83'};
const rect=(x,y,w,h,color)=>({op:'rect',x,y,w,h,color});const frames=[];
for(const [mode,count] of [['idle',2],['walk',4],['sit',2],['sleep',2]])for(let f=0;f<count;f++){
 let ops=[];
 if(mode==='sleep'){ops=[rect(3,29,19,1,'chair'),rect(16,23,6,6,'skin'),rect(16,22,6,2,'hair'),rect(5,25,12,4,'blanket'),rect(18,25,2,1,f?'eye':'skin')];}
 else {const sit=mode==='sit',headY=sit?11:7;
 if(sit)ops.push(rect(7,21,12,2,'chair'),rect(7,22,2,8,'chair'),rect(17,22,2,8,'chair'));
 ops.push(rect(9,headY,7,7,'skin'),rect(8,headY-1,8,3,'hair'),rect(14,headY+3,1,1,(mode==='idle'||mode==='sit')&&f?'skin':'eye'),rect(8,headY+7,9,sit?5:8,'coat'),rect(8,headY+10,9,2,'stripe'),rect(6,headY+8,2,7,'skin'));
 if(sit)ops.push(rect(10,23,9,3,'pants'),rect(17,25,2,4,'pants'),rect(16,29,4,1,'shoe'));
 else {const lifted=mode==='walk'&&f===1,rightLifted=mode==='walk'&&f===3;ops.push(rect(9,22,3,lifted?5:7,'pants'),rect(14,22,3,rightLifted?5:7,'pants'),rect(8,lifted?27:29,4,1,'shoe'),rect(14,rightLifted?27:29,4,1,'shoe'));}
 }
 frames.push({name:`${mode}-${f}`,duration:mode==='walk'?140:mode==='sleep'?700:400,ops});
}
const recipe={version:1,name:'no-rules-observer',width:24,height:32,palette,frames,animations:Object.fromEntries(['idle','walk','sit','sleep'].map(mode=>[mode,{frames:frames.filter(f=>f.name.startsWith(mode+'-')).map(f=>f.name)}])),sheet:{columns:4,padding:0,scale:1}};
writeFileSync(path.join(game,'art/observer.json'),JSON.stringify(recipe,null,2)+'\n');
const output=path.join(game,'public/prototype/observer');mkdirSync(output,{recursive:true});
const result=spawnSync(process.execPath,[path.join(game,'node_modules/pixelbolt/bin/pixelbolt.js'),'render',path.join(game,'art/observer.json'),'--out',output,'--force'],{stdio:'inherit'});if(result.status)process.exit(result.status);
writeFileSync(path.join(game,'art/observer-contact.json'),JSON.stringify({groundY:30,width:24,height:32,frames:frames.map(f=>f.name),author:'Original NO RULES recipe; no external sprite assets'},null,2)+'\n');

for(const file of ['player.js','preview.html','README.txt','no-rules-observer.tres','no-rules-observer.css','no-rules-observer.pixel.json'])rmSync(path.join(output,file),{force:true});
rmSync(path.join(output,'animations'),{recursive:true,force:true});
