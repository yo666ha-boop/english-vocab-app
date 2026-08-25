# みかみ塾 英語問題アプリ 作業正本チェックポイント

更新基準: 2026-08-25 JST

## このファイルの役割
このファイルを、手動作業と定期実行の**共通の唯一の進捗正本**として使う。
手動用・自動用で別checkpointを作らない。各runの開始時に必ずこのファイルとGitHub actualを読み、終了前に必ずこのファイルを更新する。
`/mnt/data` や会話添付は一時作業場所であり、継続作業の正本にしない。

## 固定参照先
- Repository: `yo666ha-boop/english-vocab-app`
- 公開URL: `https://yo666ha-boop.github.io/english-vocab-app/problem-app/`
- 現在の作業ブランチ: `fix-vocab-grammar-range-20260825`
- 公開main: 全ゲートPASSまで途中修正を直接入れない
- 対象ファイル: `problem-app/index.html`
- root `index.html`: この英語問題アプリ修正では変更しない
- 共通checkpoint: `audit/ENGLISH_PROBLEM_APP_WORK_CHECKPOINT.md`

## 2026-08-25 手動作業で確認したactual
- main HEAD at branch creation: `b456fd6b1f5260daab4779f56acf74f6625b3bb0`
- main `problem-app/index.html` blob: `01c991b9751f70a2ae2029e2f174296ab603f85c`
- size: 3,792,058 bytes
- HTMLは約2,595,608 chars / 615 newlinesで、巨大な単一HTML。通常の部分取得では中身が空になる場合があるため、GitHub Actionsでactualファイルを直接解析する診断経路を使う。
- 診断branch workflow: `.github/workflows/diagnose-problem-app-vocab-grammar.yml`
- 診断出力: `audit/PROBLEM_APP_VOCAB_GRAMMAR_DIAG.json`
- 検出した主要識別子: `passesVocab`, `passesPrereqGrammar`, `useVocabGate`, `requiredGrammarStageIndex`, `baseFiltered`, `candidates`, `currentGrade`, `currentTextbook`, `currentSectionIndex`, `vocabMode`。

## 現在の目的
ユーザー指摘の「単語制限をかけると、既習文法で作れるはずの問題までほとんど出なくなる」問題を根本修正する。

正しい仕様:
1. 先に、その教科書・学年・単元時点までに習得済みの文法候補を決定する。
2. 単語制限は、その既習文法候補そのものを不必要に消すために使わない。
3. 既習文法で問題を作れる場合、指定単元までの許可語彙を使って自然な英文へ差し替え・生成できるようにする。
4. 複数形、三単現、過去形、過去分詞、ing、比較級・最上級、短縮形などは基本形・変化形・文法時系列の両方で正しく許可判定する。
5. 教科書をまたいだ語彙範囲や単元順の誤判定で候補を落とさない。
6. 単語制限OFF/ONで、既習文法カテゴリのcoverageが不自然に崩壊しないことを数値で検証する。

## 現在工程
`VOCAB_GRAMMAR_GATE_DIAGNOSIS`

次に行うこと:
1. actual HTMLから `passesVocab` / `passesPrereqGrammar` / `useVocabGate` / `requiredGrammarStageIndex` とその呼び出し元の完全な関数コンテキストを抽出する。
2. 文法ゲート通過数 → 語彙ゲート通過数 → 最終candidate数を条件別に計測できる診断を追加する。
3. NH/SS、中1〜中3、早期/中盤/後半の代表単元でOFF/ON比較を行う。
4. 活用形・複数形・派生形の誤落ちを抽出する。
5. 原因が確定したらbranchで修正し、静的/実ブラウザ/印刷を含む回帰テストを行う。
6. 全ゲートPASS後だけmainへ反映し、公開URLをactual確認する。

## 禁止
- 手動用と自動用で別branch・別checkpointを勝手に作らない。
- `/mnt/data` に見つからないことだけを理由に「ファイル不明」として停止しない。
- prompt内の古い進捗をGitHub actual/checkpointより優先しない。
- root `index.html`、単語アプリ本体、別プロジェクトをこの作業の都合で変更しない。
- 診断途中の修正をmainへ直接入れない。
- 件数を合わせるためだけの例外語・単元・問題ID hard-codeをしない。

## 毎run終了前に必ず更新する項目
- 作業日時
- branch HEAD / main HEAD
- 今回完了した実作業
- 現在工程
- 完了済み工程
- 残作業
- 正確な停止点
- 次回開始点
- 語彙ゲート/文法ゲートの計測結果
- OFF/ON coverage比較
- 修正commit
- CI/run/PASS/FAIL
- main反映有無
- 公開URL actual確認結果

## 現在の正確な停止点
診断用workflowにより主要関数名の特定まで完了。次は4主要関数と呼び出し元の完全コンテキスト抽出から再開する。
