# 英語問題アプリ 完全重複残存判定

最終品質候補（2026-08-29 JST）の `audit/PROBLEM_APP_SEMANTIC_DUPLICATE_REVIEW.json` と `audit/PROBLEM_APP_CONTENT_QUALITY.json` を根拠に、完全重複の残存を次のとおり判定する。

- 英語問題数: 10,511
- exact duplicate Q/A: 86群 / 余剰115問
- 5件以上の大量完全重複: 0群
- 10件以上: 0群
- same-family + same-prefix（同一生成元内の高確度テンプレートコピー）: 0群 / 余剰0問
- same-family cross-prefix: 52群 / 余剰81問
- cross-category: 34群 / 余剰34問

## 判定

v1〜v10の汎用多様化により、同一prefix・同一family内で繰り返されていた高確度の生成テンプレートコピーは0群まで解消した。5件以上の大量同一Q/Aも0群である。

残るsame-family cross-prefixは、異なる問題系列・教材ソースprefix間で同じ文法事項を反復する小規模（最大4件）の重なりであり、同一生成テンプレートが連続複製された状態とは区別する。cross-category群は、同じ英文・知識を異なる設問観点や復習カテゴリで扱う教材上の反復を含むため、件数削減のみを目的として機械的に改変しない。

したがって「無意味な大量完全重複」のhard gateは、(1) 5件以上=0、(2) same-family+same-prefix=0 を満たしたことでPASSとする。残存86群は品質異常ではなく、別ソース・別観点にまたがる小規模反復として許容する。

この判定は重複件数を0にすることを目的とせず、語彙時系列・文法時系列・自然さ・設問解答一致を壊さないことを優先する。
