#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mikami-reading-v3-'));
const input=path.join(dir,'in.html'),output=path.join(dir,'out.html');
const cases=[
{id:'M2-RD2-1549',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: What will you do tomorrow? B: I will play soccer tomorrow.\n問い：Bの内容に合うように日本語で説明しなさい。',a:'I will play soccer tomorrow.'},
{id:'M2-RD2-1550',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: What will you do tomorrow? B: ( )\n空所に入る答えを書きなさい。',a:'I will play soccer tomorrow.'},
{id:'M2-RD2-1551',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: Why did you stay home yesterday? B: Because I was sick.\n問い：Bの内容に合うように日本語で説明しなさい。',a:'Because I was sick.'},
{id:'M2-RD2-1552',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: Why did you stay home yesterday? B: ( )\n空所に入る答えを書きなさい。',a:'Because I was sick.'},
{id:'M2-RD2-1553',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: When did Mika visit Kyoto? B: She visited Kyoto last week.\n問い：Bの内容に合うように日本語で説明しなさい。',a:'She visited Kyoto last week.'},
{id:'M2-RD2-1554',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: When did Mika visit Kyoto? B: ( )\n空所に入る答えを書きなさい。',a:'She visited Kyoto last week.'},
{id:'M2-RD2-1555',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: Where is Takumi going to study? B: He is going to study in the library.\n問い：Bの内容に合うように日本語で説明しなさい。',a:'He is going to study in the library.'},
{id:'M2-RD2-1556',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: Where is Takumi going to study? B: ( )\n空所に入る答えを書きなさい。',a:'He is going to study in the library.'},
{id:'M2-RD2-1557',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: How can you go to school? B: I can go to school by bike.\n問い：Bの内容に合うように日本語で説明しなさい。',a:'I can go to school by bike.'},
{id:'M2-RD2-1558',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: How can you go to school? B: ( )\n空所に入る答えを書きなさい。',a:'I can go to school by bike.'},
{id:'M2-RD2-1559',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: What do you enjoy doing after school? B: I enjoy reading comics after school.\n問い：Bの内容に合うように日本語で説明しなさい。',a:'I enjoy reading comics after school.'},
{id:'M2-RD2-1560',subject:'英語',grade:'中2',category:'読解・会話完成',type:'読解',q:'A: What do you enjoy doing after school? B: ( )\n空所に入る答えを書きなさい。',a:'I enjoy reading comics after school.'}
];
const filler=Array.from({length:10001-cases.length},(_,i)=>({id:`DUMMY-${i}`,subject:'数学',grade:'中3',category:'dummy',type:'dummy',q:'x',a:'x'}));
fs.writeFileSync(input,`<!doctype html><script id="qb-data" type="application/json">${JSON.stringify([...cases,...filler])}</script>`);
execFileSync(process.execPath,['tools/repair_reading_v3.mjs',input,output],{stdio:'pipe'});
const out=fs.readFileSync(output,'utf8');
const qb=JSON.parse(out.match(/<script id="qb-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const by=Object.fromEntries(qb.map(x=>[x.id,x]));
const expected={
'M2-RD2-1549':'明日、サッカーをします。','M2-RD2-1551':'病気だったからです。','M2-RD2-1553':'ミカは先週、京都を訪れました。','M2-RD2-1555':'タクミは図書館で勉強する予定です。','M2-RD2-1557':'自転車で学校へ行けます。','M2-RD2-1559':'放課後、マンガを読むことを楽しんでいます。'};
for(const [id,a] of Object.entries(expected))if(by[id]?.a!==a)throw new Error(`${id}: expected ${a}, got ${by[id]?.a}`);
for(const id of ['M2-RD2-1550','M2-RD2-1552','M2-RD2-1554','M2-RD2-1556','M2-RD2-1558','M2-RD2-1560'])if(!/^[A-Za-z]/.test(by[id]?.a||''))throw new Error(`${id}: English blank answer changed unexpectedly`);
console.log('Reading V3 regression: OK');
