# Svelte 5 移行計画

## 目的

このプロジェクト（cesium-properties-popup）をSvelte 4からSvelte 5へ移行し、新しい反応性システム「Runes」の利点を活かしたコードベースにアップグレードすることが目的です。この移行により以下のメリットを得ることができます：

- パフォーマンスの向上：より効率的な反応性システム
- コード構造の改善：コンポーネント外でも反応性を活用可能
- 型安全性の強化：TypeScriptとの統合が向上
- 将来性の確保：最新の機能やセキュリティ更新の継続的な受け取り

## 現状分析

現在のプロジェクトはすでにSvelte 5のパッケージがインストールされていますが、コードベースはSvelte 4の構文で書かれています。主な移行対象は以下の機能です：

- 反応性変数（let）の$state()への変換
- リアクティブステートメント（$:）の更新
- ライフサイクル関数（onMount, onDestroy）の確認と必要な修正
- コンポーネントのprops宣言の更新

## 影響範囲

### 影響を受けるファイル

1. **Svelteコンポーネント**:

   - ライブラリコンポーネント:
     - `/src/lib/components/EntityPopup.svelte`
     - `/src/lib/components/PopupPositioner.svelte`
     - `/src/lib/components/PopupContent.svelte`
   - ルートページとレイアウト:
     - `/src/routes/+layout.svelte`
     - `/src/routes/+page.svelte`
   - デモページ用コンポーネント:
     - `/src/routes/cesium/Entities.svelte`
     - `/src/routes/cesium/EntityPopup.svelte`
     - `/src/routes/cesium/Map.svelte`
     - `/src/routes/cesium/components/PopupContent.svelte` (lib版より単純な構造)
     - `/src/routes/cesium/components/PopupPositioner.svelte` (lib版とほぼ同じ構造)

2. **TypeScript関連ファイル**:

   - 型定義ファイル（`/src/lib/types/index.ts`）

3. **設定ファイル**:
   - `svelte.config.js`（必要に応じて更新）
   - `tsconfig.json`（必要に応じて更新）
   - `vite.config.ts`（必要に応じて更新）

### 影響の少ないファイル

以下のファイルは純粋なTypeScriptユーティリティであり、Svelteの反応性システムに依存していないため、変更の必要性は低いです：

- `/src/lib/utils/*.ts`ファイル群

  - `entityHelpers.ts`
  - `entityPositionStrategies.ts`
  - `popupPositioning.ts`
  - `popupSettings.ts`
  - `terrainHeightCache.ts`
  - `throttle.ts`

- `/src/routes/cesium/utils/*.ts`ファイル群
  - こちらは`/src/lib/utils/`とほぼ同じ内容のファイルが含まれており、デモページ用の実装と思われます

### コードの重複について

`/src/lib/` と `/src/routes/cesium/` で多くのコードが重複していることが確認されました。これはライブラリとデモページでの実装が別々に管理されているためと思われます。移行の際には以下の点も考慮すべきです：

1. コードの重複を減らす方法（共通モジュールの利用など）
2. 各ユーティリティの相互依存関係の確認

## 移行手順

### 1. 準備フェーズ

1. **プロジェクトのバックアップ**

   - 移行前に全コードのバックアップを作成

2. **dependencies確認**

   - すでにSvelte 5がインストールされていることを確認（package.jsonより確認済み）
   - 関連パッケージが最新バージョンであることを確認

   ```bash
   pnpm update @sveltejs/kit @sveltejs/package @sveltejs/vite-plugin-svelte svelte-check
   ```

3. **設定ファイルの確認・更新**
   - `svelte.config.js`がSvelte 5に対応しているか確認
   - `tsconfig.json`の設定が最新であるか確認

### 2. 互換モードでのテスト

1. **互換モードの確認**

   - まずはSvelte 5の互換モードでアプリケーションが正常に動作するか確認
   - 互換モードを設定（svelte.config.jsに追加）

   ```javascript
   // svelte.config.js内
   const config = {
   	compilerOptions: {
   		legacy: { componentApi: true }
   	},
   	preprocess: vitePreprocess(),
   	kit: {
   		adapter: adapter()
   	}
   };
   ```

2. **開発サーバー起動とテスト**
   ```bash
   pnpm run dev
   ```
   - すべての機能が正常に動作することを確認

### 3. コンポーネント移行（コンポーネントごとに段階的に行う）

#### 3.1 基本的なコンポーネント移行パターン

以下のパターンで各コンポーネントを移行します：

1. **反応性変数の変換**

   - `let` による反応性変数宣言を `$state()` に変換

   ```svelte
   <!-- Before -->
   <script>
     let count = 0;
   </script>

   <!-- After -->
   <script>
     let count = $state(0);
   </script>
   ```

2. **props宣言の更新**

   - `export let` から props への移行

   ```svelte
   <!-- Before -->
   <script>
     export let name = 'default';
   </script>

   <!-- After -->
   <script>
     let { name = 'default' } = $props();
   </script>
   ```

3. **リアクティブステートメントの確認**

   - `$:` リアクティブステートメントが正しく動作するか確認、必要に応じて`$derived`や`$effect`に変更

4. **ライフサイクル関数の更新**

   - `onMount`/`onDestroy` から `$effect`への移行を検討

   ```svelte
   <!-- Before -->
   <script>
     import { onMount, onDestroy } from 'svelte';
     let timer;

     onMount(() => {
       timer = setInterval(() => {...}, 1000);
     });

     onDestroy(() => {
       clearInterval(timer);
     });
   </script>

   <!-- After -->
   <script>
     let timer = $state();

     $effect(() => {
       timer = setInterval(() => {...}, 1000);
       return () => clearInterval(timer);
     });
   </script>
   ```

#### 3.2 移行優先順序

以下の順序でコンポーネントを移行します：

1. 基本的なユーティリティコンポーネント

   - `/src/lib/components/PopupContent.svelte`（比較的シンプルな構造）
   - `/src/routes/cesium/components/PopupContent.svelte`（さらにシンプルな構造）

2. 中間レベルの複雑さのコンポーネント

   - `/src/lib/components/PopupPositioner.svelte`
   - `/src/routes/cesium/components/PopupPositioner.svelte`

3. 最も複雑なコンポーネント

   - `/src/lib/components/EntityPopup.svelte`
   - `/src/routes/cesium/EntityPopup.svelte`

4. 残りのコンポーネント
   - ルートレイアウトとページ (`+layout.svelte`, `+page.svelte`)
   - その他のCesiumディレクトリ内のコンポーネント (`Map.svelte`, `Entities.svelte`)

#### 3.3 テスト

各コンポーネント移行後に動作確認テストを行います。

### 4. 共通ユーティリティの移行とコード整理

1. **共有状態管理の見直し**

   - 現在のストア実装を確認し、必要に応じてRunesベースの実装に変更
   - グローバルステートの再設計
   - `/src/lib/` と `/src/routes/cesium/` で重複しているユーティリティの管理方法の検討

2. **カスタムアクションの確認**

   - 使用中のカスタムアクションがあれば、Svelte 5の新しいAPI形式に適応

3. **コードの重複削減**
   - 重複するユーティリティの統一方法の検討
   - デモページでの実装を簡素化し、ライブラリの実装を再利用する方法の検討
   - 以下の重複ファイルセットを特に注意して確認:
     - `entityHelpers.ts`
     - `popupPositioning.ts`
     - `popupSettings.ts`
     - `throttle.ts`

### 5. 型定義とドキュメントの更新

1. **型定義の更新**

   - Svelte 5の新しい型システムに合わせて型定義を更新

2. **ドキュメントコメントの更新**
   - 新しい実装に基づいてJSDocコメントなどを更新

### 6. 最終テストと最適化

1. **包括的なテスト**

   - すべての機能のエンドツーエンドテスト
   - エッジケースの確認

2. **パフォーマンス最適化**

   - Svelte 5の機能を活用したパフォーマンス最適化
   - 不必要な反応性の削減

3. **バンドルサイズの検証**
   - 最終的なバンドルサイズを確認し、必要に応じて最適化

## 詳細なTODOリスト

### 準備フェーズ

- [ ] プロジェクトコードのバックアップ作成
- [ ] 依存パッケージの更新確認
- [ ] 設定ファイルの確認・更新
  - [ ] svelte.config.js
  - [ ] tsconfig.json
  - [ ] vite.config.ts

### 互換モードテスト

- [ ] svelte.config.jsに互換モード設定追加
- [ ] 開発サーバーでの動作確認
- [ ] 既存機能の動作テスト

### コンポーネント移行

#### 基本コンポーネント

- [ ] ライブラリコンポーネント
  - [ ] `/src/lib/components/PopupContent.svelte`
    - [ ] 反応性変数の変換
    - [ ] props宣言の更新 (`$props()`)
    - [ ] リアクティブステートメント (`$:` → `$derived`)の確認
- [ ] デモ用コンポーネント
  - [ ] `/src/routes/cesium/components/PopupContent.svelte`
    - [ ] 反応性変数の変換
    - [ ] props宣言の更新
    - [ ] リアクティブステートメントの確認

#### 中間レベルコンポーネント

- [ ] ライブラリコンポーネント
  - [ ] `/src/lib/components/PopupPositioner.svelte`
    - [ ] 反応性変数の変換
    - [ ] props宣言の更新
    - [ ] イベントリスナーの処理方法確認
    - [ ] ライフサイクル関数の更新 (`onMount`/`onDestroy` → `$effect`)
- [ ] デモ用コンポーネント
  - [ ] `/src/routes/cesium/components/PopupPositioner.svelte`
    - [ ] 反応性変数の変換
    - [ ] props宣言の更新
    - [ ] イベントリスナーの処理方法確認
    - [ ] ライフサイクル関数の更新

#### 複雑なコンポーネント

- [ ] ライブラリコンポーネント
  - [ ] `/src/lib/components/EntityPopup.svelte`
    - [ ] 反応性変数の変換
    - [ ] props宣言の更新
    - [ ] イベントハンドラーの処理の確認
    - [ ] ライフサイクル関数の更新
- [ ] デモ用コンポーネント
  - [ ] `/src/routes/cesium/EntityPopup.svelte`
    - [ ] 反応性変数の変換
    - [ ] props宣言の更新
    - [ ] イベントハンドラーの処理の確認
    - [ ] ライフサイクル関数の更新

#### その他コンポーネント

- [ ] ルートコンポーネント
  - [ ] `/src/routes/+layout.svelte`
  - [ ] `/src/routes/+page.svelte`
- [ ] Cesiumディレクトリ内のコンポーネント
  - [ ] `/src/routes/cesium/Entities.svelte`
  - [ ] `/src/routes/cesium/Map.svelte`

### 共通ユーティリティ

- [ ] 状態管理の見直し
  - [ ] ストアの実装確認
  - [ ] グローバルステート管理の最適化
  - [ ] 必要に応じて新しいRunesベースのストアの作成
- [ ] カスタムアクションの確認と更新
- [ ] コードの重複解消
  - [ ] `/src/lib/utils/` と `/src/routes/cesium/utils/` の統合検討
  - [ ] ライブラリとデモでの共通コード共有方法の検討
  - [ ] デモページでのライブラリ実装の直接利用の検討

### 最終チェック

- [ ] 型定義の更新
- [ ] ドキュメント更新
- [ ] 最終テスト
  - [ ] 全機能テスト
  - [ ] エッジケーステスト
- [ ] パフォーマンス最適化
- [ ] バンドルサイズ確認

## コンポーネント変換例

### PopupContent.svelte の変換例

**Before (lib/components/PopupContent.svelte):**

```svelte
<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';
	import type { EntityPopupOptions } from '../types';

	export let entity: CesiumType.Entity | undefined;
	export let cesium: typeof CesiumType | undefined;
	export let options: EntityPopupOptions = {};

	// プロパティをフィルタリングするための関数
	function filterProperty(name: string, value: unknown): boolean {
		if (options.filterProperties) {
			return options.filterProperties(name, value);
		}
		return true; // デフォルトではすべてのプロパティを表示
	}

	// エンティティから表示対象のプロパティを取得して必要に応じてフィルタリング
	$: filteredProperties = entity
		? getPropertyEntries(entity).filter(([key, value]) => filterProperty(key, value))
		: [];
</script>
```

**Before (routes/cesium/components/PopupContent.svelte):**

```svelte
<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';

	export let entity: CesiumType.Entity | undefined;
	export let cesium: typeof CesiumType | undefined;
</script>
```

**After (lib/components/PopupContent.svelte):**

```svelte
<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';
	import type { EntityPopupOptions } from '../types';

	let {
		entity = undefined,
		cesium = undefined,
		options = {}
	} = $props<{
		entity?: CesiumType.Entity;
		cesium?: typeof CesiumType;
		options?: EntityPopupOptions;
	}>();

	// プロパティをフィルタリングするための関数
	function filterProperty(name: string, value: unknown): boolean {
		if (options.filterProperties) {
			return options.filterProperties(name, value);
		}
		return true; // デフォルトではすべてのプロパティを表示
	}

	// エンティティから表示対象のプロパティを取得して必要に応じてフィルタリング
	const filteredProperties = $derived(
		entity ? getPropertyEntries(entity).filter(([key, value]) => filterProperty(key, value)) : []
	);
</script>
```

**After (routes/cesium/components/PopupContent.svelte):**

```svelte
<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';

	let { entity = undefined, cesium = undefined } = $props<{
		entity?: CesiumType.Entity;
		cesium?: typeof CesiumType;
	}>();
</script>
```

## リスクとその対策

1. **互換性の問題**

   - **リスク**: 一部の機能がSvelte 5で動作しない可能性
   - **対策**: 互換モードでの段階的移行、問題の早期発見と解決

2. **パフォーマンスへの影響**

   - **リスク**: 移行による一時的なパフォーマンス低下
   - **対策**: 各段階でのパフォーマンス測定、ボトルネックの特定

3. **テスト不足**

   - **リスク**: 未発見のバグや問題
   - **対策**: 包括的なテスト計画、ユーザーシナリオのカバレッジ確保

4. **チームの理解度**

   - **リスク**: 新しい概念への適応に時間がかかる
   - **対策**: ドキュメント作成、チームトレーニング、移行パターンの共有

5. **コードの重複による複雑さ**

   - **リスク**: ライブラリとデモページで重複するコードの移行が複雑になる
   - **対策**: 移行前にコード構造を見直し、重複を減らすリファクタリングを検討

6. **テスト環境の複雑さ**
   - **リスク**: Cesiumとの統合テストが複雑になる可能性
   - **対策**: Cesiumの各バージョンとの互換性テスト計画の作成

## 結論

Svelte 5への移行は、コードベースの近代化と将来の開発効率向上のための重要なステップです。段階的なアプローチを取り、各ステップでしっかりとテストを行うことで、スムーズな移行が可能になります。

この移行はただの構文変更だけでなく、プロジェクト全体の設計改善の機会でもあります。特にライブラリ (`/src/lib/`) とデモページ (`/src/routes/cesium/`) 間のコード重複を解消し、メンテナンス性を向上させることが推奨されます。

Runseシステムの導入により、以下のようなメリットが期待できます：

1. コンポーネント外での反応性の活用による、より柔軟なコード設計
2. TypeScriptとの統合強化による型安全性の向上
3. パフォーマンスの最適化

この計画に従って進めることで、新しいRunesシステムの利点を最大限に活かしつつ、既存の機能を維持・改善することができます。
