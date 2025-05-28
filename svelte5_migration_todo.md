# Svelte 5 マイグレーション TODO リスト

Svelte 5への自動マイグレーション後に、手動で修正が必要な項目とその内容をまとめました。

## 1. ライフサイクル関数の $effect への変換

現在の自動マイグレーションでは、`onMount` と `onDestroy` が従来の形式のまま残っています。これらを Svelte 5 の `$effect` に変換する必要があります。

### 対象ファイル:

1. `/src/lib/components/EntityPopup.svelte`
2. `/src/routes/cesium/EntityPopup.svelte`
3. `/src/lib/components/PopupPositioner.svelte`
4. `/src/routes/cesium/components/PopupPositioner.svelte`
5. `/src/routes/cesium/Map.svelte`

### 変換例:

**変換前:**

```svelte
import { onMount, onDestroy } from 'svelte';

// ...

onMount(() => {
  setupEventHandler();
});

onDestroy(() => {
  removeEventHandler();
});
```

**変換後:**

```svelte
import { effect } from 'svelte';

// ...

$effect(() => {
  setupEventHandler();
  return () => {
    removeEventHandler();
  };
});
```

## 2. svelte/legacy の依存関係の除去

自動マイグレーションでは、`$:` リアクティブステートメントを `run()` 関数に変換し、`svelte/legacy` への依存関係を導入しています。これらを純粋な Svelte 5 のアプローチに変換することを検討すべきです。

### 対象ファイル:

1. `/src/lib/components/EntityPopup.svelte`
2. `/src/routes/cesium/EntityPopup.svelte`
3. `/src/lib/components/PopupPositioner.svelte`
4. `/src/routes/cesium/components/PopupPositioner.svelte`
5. `/src/routes/cesium/Entities.svelte`

### 変換例:

**変換前:**

```svelte
import { run } from 'svelte/legacy';

// ...

run(() => {
  if (viewer && cesium && !eventHandler) {
    setupEventHandler();
  }
});
```

**変換後:**

```svelte
// オプション1: $effect を使用
$effect(() => {
  if (viewer && cesium && !eventHandler) {
    setupEventHandler();
  }
});

// オプション2: effectable な変数へ明示的な依存関係として記述
$effect.root(() => {
  const track = $effect;
  track(viewer);
  track(cesium);
  track(eventHandler);

  if (viewer && cesium && !eventHandler) {
    setupEventHandler();
  }
});
```

## 3. svelte.config.js の設定確認と更新

互換モードがまだ有効になっている可能性があります。完全な Svelte 5 移行のために設定を確認し、必要に応じて更新します。

### 変更内容:

**変換前:**

```javascript
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter()
	}
};
```

**変換後 (必要に応じて):**

```javascript
const config = {
	compilerOptions: {
		runes: true, // Runesを有効化
		legacy: { componentApi: false } // レガシーコンポーネントAPIを無効化
	},
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter()
	}
};
```

## 4. 非反応性変数の識別と最適化

自動変換では、すべての変数が反応性を持つように変換されていない可能性があります。以下のような非反応性変数の扱いを確認します。

### 確認すべき内容:

1. `displayMode` や `isProcessingClick` などの変数が $state() を使った宣言になっているか確認
2. 不必要に反応性を持つ変数を最適化（例：定数や単純な一時変数）

## 5. 重複コードの解消

`/src/lib/` と `/src/routes/cesium/` で重複するコードの統合を検討します。

### 対象ディレクトリ/ファイル:

- `/src/lib/utils/` と `/src/routes/cesium/utils/` の重複ユーティリティ
- 類似するコンポーネント（`PopupPositioner.svelte`、`PopupContent.svelte`など）

### 推奨アプローチ:

1. `/src/lib/` のコードをライブラリとして参照可能にする
2. `/src/routes/cesium/` からライブラリのコードを直接参照するように変更

## 6. テストの実施

マイグレーション後のコードが期待通りに動作することを確認するテストを実施します。

### テスト対象:

1. イベント処理（特にクリックとホバーイベント）
2. ライフサイクル機能（初期化とクリーンアップ）
3. 反応性システムの動作（状態変化時の再レンダリング）

## 優先順位の提案

1. ライフサイクル関数の変換（$effectへの移行）
2. svelte/legacy 依存関係の除去
3. 設定ファイルの確認と更新
4. 非反応性変数の確認と最適化
5. 重複コードの解消
6. 総合的なテスト

## 注意点

- ライフサイクル関数を $effect に変換する際は、クリーンアップ関数が正しく返されるよう注意する
- 非同期処理がある場合は、Svelte 5 でのイベントタイミングが異なる可能性があることを考慮する
- ブラウザのパフォーマンスプロファイラを使用して、各変換後のパフォーマンスを測定する
