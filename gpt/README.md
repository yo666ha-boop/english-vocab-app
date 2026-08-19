# みかみ塾 答案分析GPT

## 目的

現在の英語問題アプリには、答案写真を読み込み、分析用プロンプトをコピーし、ChatGPTの返答をアプリへ貼り戻す旧フローがある。

このディレクトリは、その往復をやめて、

`問題を解く / テストを受ける`
→ `答案写真を答案分析GPTへ送る`
→ `GPTが正本問題データと照合する`
→ `戻り地点・次の練習まで分析する`
→ `GPT側で印刷用レポートを完成させる`

という独立した答案分析フローを作るための正本。

## 正本との関係

問題バンクの正本は、修正版 canonical HTML 内の `qb-data`。
完成済み検証条件：

- 全問題: 10,513
- 英語: 10,511
- unique ID: 10,513
- final quality errors: 0
- vocab coordinate: `v7-2026-08-18-1based`
- prerequisite grammar gate: PASS
- quality gate: PASS

答案分析GPT用Knowledgeは、必ずこの修正版HTMLから

```bash
node tools/export_mikami_answer_gpt_knowledge.mjs \
  <repaired-canonical.html> \
  dist/gpt/mikami_english_question_bank_knowledge.jsonl \
  dist/gpt/mikami_english_question_bank_knowledge.manifest.json
```

で生成する。

旧版問題データを手作業でKnowledgeへ混ぜない。

## なぜ問題IDで照合できるか

現行アプリの問題プリントは、各設問の見出しに `Q番号 + 問題ID` を印刷している。
そのため、みかみ塾オリジナル問題では、答案写真または問題プリント写真にIDが写れば、答案分析GPTはKnowledgeの同じIDを直接照合できる。

これにより、毎回アプリから問題文をコピーしてGPTへ渡す必要がない。

## GPTへ登録するもの

1. `gpt/mikami_answer_analysis_gpt_instructions.md`
   - GPTの正式指示書
2. `dist/gpt/mikami_english_question_bank_knowledge.jsonl`
   - 修正版正本から生成した英語10,511問
3. `dist/gpt/mikami_english_question_bank_knowledge.manifest.json`
   - 件数・SHA・生成元の監査情報
4. `gpt/mikami_answer_analysis_output_schema.json`
   - 将来アプリ連携するときの安定出力形式

## 生徒・講師の実運用

### みかみ塾オリジナル問題

1. 問題プリントを解く。
2. 答案または採点済みプリントを写真で撮る。
3. 答案分析GPTへ写真を送る。
4. GPTが印刷された問題IDを正本Knowledgeと照合する。
5. 正誤・誤答カテゴリ・共通原因・戻り地点・次の練習を分析する。
6. GPTがそのまま印刷できるレポートを出す。

**アプリへの返答貼り戻しは不要。**

### 学校テスト

学校テストは正本IDがないので、問題文・生徒答案・採点結果が読める写真を送る。
複数ページなら全ページを送る。
GPTは写真に見える内容だけを根拠にし、不鮮明な箇所は判定保留にする。

## 現行アプリの旧フロー

現行HTMLには次の旧UIが残っている。

- `分析用プロンプトをコピー`
- `返答をレポートへ反映`
- ChatGPT返答の貼り付け欄

これは答案分析GPTが完成するまでのフォールバックとして残す。
新フローのKnowledge生成・検証・実機確認が終わった後、別工程でUIを整理する。

問題バンク正本の修正と、答案分析UIの変更を同時に混ぜない。

## 完成条件

答案分析GPT工程の完成は、次のすべてを満たしたとき。

- [ ] 修正版canonicalからKnowledge JSONLを生成
- [ ] 10,511件をmanifestで確認
- [ ] 任意の既知IDを複数件照合し、問題文・正答・カテゴリが一致
- [ ] 正答答案写真で誤判定しない
- [ ] 複数カテゴリの誤答案で、共通原因と戻り地点を出せる
- [ ] 不鮮明答案を無理に採点しない
- [ ] 学校テスト写真も正本外モードで分析できる
- [ ] A4印刷用レポートがそのまま使える
- [ ] 旧アプリへのコピペ往復なしで運用できる
- [ ] 最終テスト後に旧写真分析UIを残すか削るか判断
