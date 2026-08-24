# みかみ塾 答案分析GPT — True Runtime 実機完了手順

この手順は synthetic self-test を実機証拠として扱わない。完成条件は、実際の Custom GPT 登録、実答案写真4ケース、A4実レンダリング/印刷、厳格validator PASSである。

## 0. 固定資産

- 登録セット Drive folder: `1J82Ur6Q-_OFRmkNq0swc6oP8bR0Z6FYj`
- Knowledge: `1_F6scCbMtPK0jw0Hi9eExqstDz2vWahk`
  - 10,511 records
  - SHA256 `be820c3e4d5c26773d642f1c055fea33f2796d71b6fca16f4e1edf5efc6f9213`
- Instructions: `1z_xPUgAkwcigqRzWjUB3JQy_6ATnPAik`
  - SHA256 `084ff607a70e679e32bc100c4081aaed7f22ebf5058d469ba20a079bd192b0be`
- Output schema: `1ceQyoCVmgHiRHS_jVppEbDBYUYpf0fvE`
  - SHA256 `8f33784b205cafe663e0c797b806e5b37036b3b06aec987eb45a7008ff37567b`
- 公開問題アプリ v2: GitHub Pages `problem-app/`
  - 3,812,209 bytes
  - SHA256 `83921d1bb9b0ed3028d1151c138326e7698278906e6d01180bc1fb1f6b2044a0`
  - My GPT URLは `chatgpt.com` / `chat.openai.com` の `/g/<id>` のみ許可

## 1. 実Custom GPT登録

1. GPT名を `みかみ塾 答案分析GPT` とする。
2. Knowledgeへ上記Knowledge JSONLを登録する。
3. Instructionsへ正式指示書を適用する。
4. output schemaを参照資産として登録する。
5. 実際の共有URL `https://chatgpt.com/g/...` または `https://chat.openai.com/g/...` を取得する。
6. 登録画面または登録状態の証拠画像を保存する。
7. 公開問題アプリへ実URLを設定し、正しい `/g/` URLが受理され、任意のHTTPS URLが拒否されることを確認する。

## 2. 実答案写真4ケース

必ず実際の答案写真を使用する。生成画像・synthetic fixture・単なる試験範囲表を実機証拠として数えない。

### correct_original
みかみ塾正本問題・全問正解。問題IDが読めること。

確認:
- IDをKnowledgeへ完全一致照合
- 存在しない誤答を作らない
- 全問正解なら correct_count = judged_count
- root_causes は空でもよい
- 次の練習は具体的かつ責めない

### multi_category_errors
複数カテゴリの実誤答を含むみかみ塾答案。

確認:
- 各ID完全一致
- 各誤答を個別分類
- root causes 最大3
- return points 最大3
- 表面単元を自動的に戻り地点へしない
- 根拠問題番号/IDを付ける

### unreadable_answer
一部が本当に不鮮明なみかみ塾答案。

確認:
- 読めない文字を推測しない
- held / 判定保留
- heldを正答率分母から除外
- unreadable_or_missingを明示
- 不鮮明IDを似た問題から推測しない

### school_test
実際の学校英語テスト答案。みかみ塾問題IDなし。

確認:
- canonical Knowledgeを根拠だと偽らない
- 写真に見える問題文・答案・採点だけを使う
- 欠けた領域を採点しない
- 一般英文法で判断した場合は明示
- 読解は語彙/構造/指示語/時系列/内容一致/根拠探索を分ける

各ケースで、元写真とGPT返答全文を別ファイルで保存する。実行日時も記録する。

## 3. A4実テスト

4ケースのうち代表的な実返答から、実際にPDFレンダリングまたは印刷確認する。

必須:
- A4縦
- 1〜2ページ
- `みかみ塾 英語答案分析レポート`
- `基本情報`
- `1. 今回できていたこと`
- `2. 間違いが集中したところ`
- `3. いちばん大きな原因`
- `4. 戻るならここ`
- `5. 次にやること`
- `6. 生徒へのひとこと`
- 横長表を避ける
- 問題全文を大量再掲しない
- held / 判定保留を隠さない
- 短い見出しと段落を使う

PDFと確認証拠をprivate領域へ保存する。

## 4. runtime evidence inputを埋める

`gpt/tests/mikami_answer_gpt_runtime_evidence_input.template.json` をprivate作業領域へコピーし、実証拠だけで埋める。

必須の明示確認:
- `registration.actual_custom_gpt=true`
- Knowledge / Instructions / output schema の実登録=true
- 4ケースすべて `executed_in_actual_custom_gpt=true`
- 4ケースすべて `photo_attached=true`
- acceptance contractのbehaviorを実確認後だけtrue
- A4 `actual_render_or_print_test=true`
- final gate 4項目を実確認後だけtrue
- `overall_runtime_pass=true` は全確認後だけ

## 5. 一括finalize

```bash
node tools/finalize_mikami_answer_gpt_runtime_evidence.mjs \
  /private/path/runtime-evidence-input.json \
  /private/path/finalized
```

このfinalizerは順に以下を実行する。

1. 実機入力の厳格検証
2. 写真/返答/登録証拠/A4 PDFのSHA256計算
3. runtime-results JSON生成
4. non-circular evidence manifest生成
5. exact registration asset identity validator
6. hardened true-runtime validator
7. evidence-chain validator

すべてPASSした場合だけ `mikami_answer_gpt_runtime_finalization.audit.json` をPASSで出す。

## 6. 完成後

- 実Custom GPT URLをcheckpointへ記録
- 4ケースのPASS結果を記録
- A4実テストPASSを記録
- runtime/evidence validator PASSを記録
- その後だけ旧コピー/貼り戻しUIを `remove_legacy` または `permanent_fallback` に最終決定する
- 完全完成後に継続タスクを停止する
