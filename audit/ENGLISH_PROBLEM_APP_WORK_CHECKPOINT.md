# みかみ塾 英語問題アプリ GitHub checkpoint mirror

更新: 2026-08-25 20:46 JST

## 正本の役割分担
- **進捗・資料・引継ぎの共通正本は Google Drive**。
- **コード・アプリ・公開物の実物正本は GitHub**。
- このGitHubファイルは、コード側から読める補助mirror/checkpointとして使う。
- 手動用・自動用で別の作業線・別branch・別checkpointを作らない。
- `/mnt/data` や会話添付は継続正本にしない。

Google Drive project:
- folder `英語問題アプリ` ID `1mpDsqlr9xicYotPOEMTcx3OT4d1dRkBa`
- management folder `00_管理・引継ぎ` ID `1o7wG-B6RwMBsHIo_TFBnQslGi44GEfT8`
- progress master Doc ID `1KHxXTXfbgbA2RRHWU4okF6vuQbuWq3wtWfpn2pF2uHE`
- rules Doc ID `1mUDyiE4BS2tKNa4ZtFk_hOWgsRDNoc3_xpMd9MEvw2k`
- source list Doc ID `1XHkrbkBtWroOzL6poRANXDB5S9EYOF47Vv9lBbDs5FU`
- work log Doc ID `1RakIim-p9cxbRN40tWVApACJ4wKN5HdND-rXP4gm8oY`

## 固定対象
- Repository: `yo666ha-boop/english-vocab-app`
- Working branch: `fix-vocab-grammar-range-20260825`
- main HEAD verified: `b456fd6b1f5260daab4779f56acf74f6625b3bb0`
- branch HEAD before this checkpoint sync: `13bbdaef1179d72212b2215c95413764d2e44c3b`
- target: `problem-app/index.html`
- public URL: `https://yo666ha-boop.github.io/english-vocab-app/problem-app/`
- root `index.html` is out of scope for this repair and must not be modified for it.
- main remains untouched until all release gates pass.

## Vocabulary canonical source
Google native Sheet `英単語_教科書別マスターデータ_NH_SS_2026_v7_app_wordbook_master`
Sheet ID `1AkKYV6h-9ZCq1-p8126u4t8z0pvPSRnHlOfY8C-3hH4`
`単語マスター`: header + 3975 canonical records.

## User-visible defect being fixed
When vocabulary restriction is enabled, too many questions disappear even for grammar already learned by the selected unit.
Correct behavior:
1. Determine learned grammar from textbook / grade / unit first.
2. Vocabulary restriction must not unnecessarily erase learned grammar categories.
3. Problems for learned grammar should use wording available within the selected vocabulary range whenever possible.
4. Inflections/plurals/3sg/past/past participle/ing/comparatives/superlatives/contractions must be judged using lemma/variant + grammar chronology.
5. No count-fitting whitelist, unit hard-code, or problem-ID exceptions.

## Completed actual work
- Diagnosed actual 3.8MB single-file app using GitHub Actions.
- Identified `passesVocab`, `passesPrereqGrammar`, `useVocabGate`, `requiredGrammarStageIndex`, and filtering call path.
- Safely rebuilt `passMeta` while preserving all 10,511 English question records.
- passMeta apply commit: `abccf22832b649d3919eaa77a83d62f9769aeae6`.
- `qb_data_unchanged=true`.
- 21,022 coordinate values: 12,778 changed / 8,244 retained.
- resolved coordinates: old 5,345 -> new 15,878; unresolved 5,144.
- Added browser matrix with resilient result commit.
- Added grammar-category OFF/ON attrition measurement.
- Browser grammar matrix run `32845099317` completed `success`; measurement and result commit both succeeded.
- Result commit: `13bbdaef1179d72212b2215c95413764d2e44c3b` (`test: record actual vocab gate browser matrix [skip ci]`).

## Current aggregate browser results
All numbers are actual UI candidate counts from branch `problem-app/index.html`.
- G1 Sunshine: OFF 2600 -> final Power-Up 6 ON 2317.
- G1 New Horizon: OFF 2600 -> final Let's Read ON 2414.
- G2 Sunshine: OFF 3055 -> final Reading 3 ON 1736.
- G2 New Horizon: OFF 3055 -> final Let's Read 3 ON 2464.
- G3 Sunshine: OFF 3920 -> final Special Project ON 2818.
- G3 New Horizon: OFF 3920 -> final Let's Read 2 ON 2879.

## Important grammar-category attrition still remaining
### Sunshine G2 final Reading 3
- gerund: OFF 396 -> ON 92 = **23.23%** (severe)
- general present: 344 -> 180 = 52.33%
- future: 401 -> 190 = 47.38%
- infinitive 1: 436 -> 263 = 60.32%
- present perfect completion/experience: 36 -> 11 = 30.56%
- present perfect continuous/progressive: 27 -> 11 = 40.74%

### Sunshine G3 final Special Project
- conjunction: OFF 120 -> ON 25 = **20.83%** (severe)
- passive: 120 -> 62 = 51.67%
- relative pronouns: 185 -> 139 = 75.14%
- subjunctive: 136 -> 64 = 47.06%

New Horizon G2 final representative categories no longer had a <25% severe category, so the remaining defect is strongly textbook/lexical-bank dependent rather than a universal grammar checkbox bug.

## Root cause established so far
The app still uses a fixed shared English question bank and primarily handles vocabulary restriction by rejecting a question when its fixed q+a contains a lexical token that cannot be resolved within the selected textbook vocabulary chronology.
Because the same fixed problems are shared across Sunshine/New Horizon, textbook-specific lexical differences cause learned grammar categories to lose many usable questions. Correcting passMeta chronology alone cannot fully solve that architectural mismatch.

Example evidence from unresolved-token audit: Sunshine G1 rejects many fixed questions containing words such as `music`, `fine`, `door`, `window`, `dishes`, `practice`, etc. Some exist in another textbook's chronology, but cross-textbook presence must not be used as an automatic whitelist.

## Current stage
`VOCAB_SAFE_VARIANT_FALLBACK_DESIGN_AND_IMPLEMENTATION`

## Next work
1. Extract severe-category rejected questions, their question types, required grammar category, and exact unresolved lexical tokens.
2. Build a vocabulary-safe variant/fallback layer that preserves grammar target, question type, and answer relation while substituting only lexical content with words permitted at the selected textbook/grade/unit.
3. Validate every variant for vocabulary chronology, grammar chronology, morphology, question/answer consistency, and naturalness before it is eligible.
4. Start with Sunshine G2 gerunds and Sunshine G3 conjunctions because final-unit attrition remains severe there.
5. Re-run full SS/NH G1-G3 early/mid/final aggregate + per-grammar matrix.
6. Then run morphology, quality, answer consistency, search/random/save/A4 print, Chromium/Firefox/WebKit-iPhone equivalent regression.
7. Only after all gates pass, merge to main and verify the public URL actual.

## Exact restart point
Begin by generating a diagnostic dataset for rejected severe-category questions and unresolved lexical tokens, then implement the generic vocabulary-safe variant/fallback generator and validator on the working branch.

## Do not do
- Do not whitelist unknown words merely to raise counts.
- Do not hard-code specific problem IDs to make metrics pass.
- Do not change root `index.html` or other projects.
- Do not update main before all gates pass.
- Do not treat a progress report as a completed run when executable work remains.
