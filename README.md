# Cesium Properties Popup

Cesiumのエンティティにホバーまたはクリックでプロパティを表示するSvelteコンポーネントライブラリです。

## 目次

- [インストール](#インストール)
- [基本的な使い方](#基本的な使い方)
- [カスタマイズオプション](#カスタマイズオプション)
- [スタイルのカスタマイズ](#スタイルのカスタマイズ)
- [コンポーネント構成](#コンポーネント構成)
- [型定義](#型定義)
- [高度な使い方](#高度な使い方)
- [ユーティリティ関数](#ユーティリティ関数)
- [実装ガイドラインとベストプラクティス](#実装ガイドラインとベストプラクティス)

## インストール

```bash
# npm
npm install cesium-properties-popup

# pnpm
pnpm add cesium-properties-popup

# yarn
yarn add cesium-properties-popup
```

## 基本的な使い方

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	let viewer: CesiumType.Viewer;
	let cesium: typeof CesiumType;

	// Cesiumビューワーの初期化（省略）
</script>

<!-- Cesiumのビューワーとライブラリを設定 -->
<div id="cesiumContainer" />

<!-- 最もシンプルな使用方法 -->
<EntityPopup {viewer} {cesium} />
```

## カスタマイズオプション

```svelte
<EntityPopup
	{viewer}
	{cesium}
	options={{
		// ホバーでのポップアップ表示を有効/無効（デフォルト: true）
		enableHover: true,

		// クリック後のホバー制限時間（ミリ秒）（デフォルト: 1000）
		clickCooldown: 1000,

		// プロパティのフィルタリング
		filterProperties: (name, value) => !name.startsWith('_'),

		// スタイル設定
		styleOptions: {
			maxWidth: 400,
			maxHeight: 500,
			popupClass: 'my-custom-popup'
		}
	}}
/>
```

## スタイルのカスタマイズ

CSSを使用してポップアップの見た目をカスタマイズできます：

```html
<style>
	:global(.my-custom-popup) {
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
		border-left-color: #ff6347 !important;
	}

	:global(.my-custom-popup h3) {
		color: #2c3e50;
		font-weight: bold;
	}

	:global(.my-custom-popup table) {
		border-collapse: separate;
		border-spacing: 0 2px;
	}
</style>
```

## コンポーネント構成

このライブラリは以下の主要コンポーネントで構成されています：

- `EntityPopup`: メインコンポーネント。Cesiumビューワー上でエンティティのポップアップを管理します。
- `PopupPositioner`: ポップアップの位置を計算・更新するコンポーネント。カメラ移動やエンティティの位置変更に応じて自動的に位置を調整します。
- `PopupContent`: ポップアップの内容を表示するコンポーネント。エンティティの名前、説明、プロパティを表示します。

## 型定義

```typescript
interface EntityPopupOptions {
	/** ホバーでポップアップを表示するかどうか */
	enableHover?: boolean;
	/** クリック後のホバー制限時間（ミリ秒） */
	clickCooldown?: number;
	/** プロパティをフィルタリングする関数 */
	filterProperties?: (name: string, value: unknown) => boolean;
	/** ポップアップのCSS設定 */
	styleOptions?: {
		/** ポップアップの最大幅（px） */
		maxWidth?: number;
		/** ポップアップの最大高さ（px） */
		maxHeight?: number;
		/** ポップアップのCSSクラス */
		popupClass?: string;
	};
}
```

## 高度な使い方

必要に応じて、各コンポーネントを個別に使用することも可能です：

```svelte
<script lang="ts">
	import { PopupPositioner, PopupContent } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	let viewer: CesiumType.Viewer;
	let cesium: typeof CesiumType;
	let selectedEntity: CesiumType.Entity | undefined;
	let isPopupOpen = false;

	// エンティティ選択のカスタムロジック
	function handleEntitySelect(entity) {
		selectedEntity = entity;
		isPopupOpen = true;
	}

	// カスタムイベントハンドラの設定
	const handler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	handler.setInputAction((click) => {
		const pickedObject = viewer.scene.pick(click.position);
		if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
			handleEntitySelect(pickedObject.id);
		}
	}, cesium.ScreenSpaceEventType.LEFT_CLICK);
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<div class="custom-popup">
			<PopupContent entity={selectedEntity} {cesium} />
			<div class="actions">
				<button on:click={() => (isPopupOpen = false)}>閉じる</button>
			</div>
		</div>
	</PopupPositioner>
{/if}
```

## ユーティリティ関数

ライブラリが提供するユーティリティ関数を直接使用することも可能です：

```typescript
import {
	formatPropertyValue,
	getPropertyEntries,
	getEntityPosition,
	worldPositionToScreenPosition,
	calculatePopupPosition,
	defaultSettings
} from 'cesium-properties-popup';

// エンティティのプロパティ値をフォーマットする
const formattedValue = formatPropertyValue(entity.properties.myProperty, cesium);

// エンティティから表示用のプロパティエントリを取得
const propertyEntries = getPropertyEntries(entity);

// エンティティの3D位置を取得する
const position = getEntityPosition(entity, cesium);

// 3D座標を画面座標に変換する
const screenPosition = worldPositionToScreenPosition(position, viewer, cesium);

// ポップアップの位置を計算する包括関数
const popupPosition = await calculatePopupPosition(entity, viewer, cesium, currentPosition);

// デフォルト設定の変更（パフォーマンスチューニングなど）
defaultSettings.updateFrequency.cameraChangeThrottle = 150; // カメラ変更のスロットリング間隔を150msに変更
```

## 実装ガイドラインとベストプラクティス

### パフォーマンス最適化

1. **大量のエンティティを扱う場合**

   ```typescript
   // フィルタリングで表示プロパティを限定
   const popupOptions = {
   	filterProperties: (name, value) => {
   		// 重要なプロパティのみを表示
   		const importantProps = ['name', 'type', 'value', 'category'];
   		return importantProps.includes(name);
   	}
   };
   ```

2. **複雑なプロパティを持つエンティティの場合**

   ```typescript
   // 巨大なJSONプロパティを持つエンティティの表示を最適化
   const popupOptions = {
   	filterProperties: (name, value) => {
   		// 巨大なオブジェクトや複雑なデータ構造は除外
   		if (typeof value === 'object' && value !== null) {
   			if (name === 'attributes' || name === 'metadata') {
   				return false; // 複雑なデータは除外
   			}
   		}
   		return true;
   	}
   };
   ```

### 視覚的カスタマイズ

1. **テーマに合わせたスタイル**

   ```svelte
   <EntityPopup
   	{viewer}
   	{cesium}
   	options={{
   		styleOptions: {
   			popupClass: 'brand-theme'
   		}
   	}}
   />

   <style>
   	:global(.brand-theme) {
   		border-left: 4px solid #3498db;
   		border-radius: 0;
   		font-family: 'Roboto', sans-serif;
   	}

   	:global(.brand-theme h3) {
   		background-color: #f5f5f5;
   		padding: 12px;
   		margin: 0;
   	}
   </style>
   ```

2. **状況に応じたスタイル変更**

   ```svelte
   <script lang="ts">
   	import { EntityPopup } from 'cesium-properties-popup';

   	let theme = 'light';

   	function toggleTheme() {
   		theme = theme === 'light' ? 'dark' : 'light';
   	}

   	$: popupOptions = {
   		styleOptions: {
   			popupClass: theme === 'light' ? 'light-theme' : 'dark-theme'
   		}
   	};
   </script>

   <button on:click={toggleTheme}>テーマ切替</button>
   <EntityPopup {viewer} {cesium} options={popupOptions} />

   <style>
   	:global(.light-theme) {
   		background: white;
   		color: #333;
   	}

   	:global(.dark-theme) {
   		background: #333;
   		color: white;
   	}
   </style>
   ```

### ユースケース別のヒント

1. **不動産データの表示**

   ```svelte
   <script>
   	const popupOptions = {
   		filterProperties: (name) => importantProperties.includes(name)
   	};
   </script>
   ```

2. **時系列データの表示**

   ```svelte
   <script>
   	// 時系列データではフィルタリングでより必要な情報に焦点を当てます
   	const popupOptions = {
   		filterProperties: (name) =>
   			['timestamp', 'observed_at', 'temperature', 'value'].includes(name)
   	};
   </script>
   ```

## ライセンス

MIT

## 開発者向け情報

詳しい実装の詳細やポップアップの位置計算ロジックについては、ソースコードのコメントを参照してください。
