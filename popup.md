# Cesiumのポップアップ実装分析

このドキュメントでは、Cesium上で地物（Entity）をクリックまたはホバーした際に表示されるプロパティポップアップの実装について分析します。

## 1. ファイル構造と役割

### コアコンポーネント

| ファイル名               | 役割                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `EntityPopup.svelte`     | ポップアップのコントローラー。クリックやホバーイベントを管理し、ポップアップの表示・非表示を制御 |
| `PopupPositioner.svelte` | ポップアップの位置決定を担当。地物の3D位置をスクリーン座標に変換し、カメラ移動に応じて位置を更新 |
| `PopupContent.svelte`    | ポップアップの内部コンテンツ(Entity名、説明、プロパティ)の表示を担当                             |

### ユーティリティモジュール

| ファイル名            | 役割                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| `popupPositioning.ts` | ポップアップ位置の計算ロジック。地形高さの考慮、キャッシュ管理を含む   |
| `entityHelpers.ts`    | Entityの位置や属性情報を取得するためのヘルパー関数群                   |
| `throttle.ts`         | 高頻度イベント（カメラ移動など）の処理頻度を制限するスロットリング関数 |

## 2. データフロー

```
[User Event] → EntityPopup → selectedEntity → PopupPositioner → PopupContent
                                              ↓
                                 calculatePopupPosition()
                                      ↓
                             [3D→画面座標変換] → popupPosition
```

## 3. 主要コンポーネントの詳細

### EntityPopup.svelte

```
- イベント監視（クリック/ホバー）
- 選択Entityの管理
- 表示モードの制御（hover/click）
- クールダウン機能
```

**重要なプロパティ:**

- `selectedEntity`: 現在選択中のEntity
- `isPopupOpen`: ポップアップの表示状態
- `displayMode`: 'hover' または 'click'

**イベントハンドリング:**

- `LEFT_CLICK`: Entityの選択、click表示モード設定
- `MOUSE_MOVE`: ホバー時の表示制御（enableHoverがtrueの場合）

### PopupPositioner.svelte

```
- 位置計算と更新
- カメラ変更イベント監視
- レンダリングループ監視
- スロットリングによる更新頻度制限
```

**主要機能:**

- `updatePopupPosition()`: Entityの3D位置を画面座標に変換
- `setupCameraChangeListener()`: カメラ移動イベントの監視（100msスロットリング）
- `setupRenderLoopUpdate()`: レンダリングループでの位置更新（150msスロットリング）

### PopupContent.svelte

```
- Entity情報の表示
- 名前、説明、プロパティの整形表示
```

**データ表示:**

- Entity名（ヘッダー）
- Entity説明（あれば）
- プロパティテーブル（キーと値のペア）

## 4. 位置計算の流れ

```
1. Entityの3D位置取得
   ↓
2. 地形高さ取得・キャッシュ確認
   ↓
3. カメラ距離に基づくオフセット計算
   ↓
4. 世界座標→画面座標変換
   ↓
5. スムージング適用（揺れ防止）
```

### popupPositioning.ts の主要機能

- `calculatePopupPosition()`: 地物の3D座標をスクリーン座標に変換
- 地形高さのキャッシングによる最適化
- 小さな位置変動（≦1px）は無視して安定性向上

### entityHelpers.ts の役割

- `getEntityPosition()`: 様々な形状のEntityから3D位置を取得
- `worldPositionToScreenPosition()`: 3D→画面座標変換とスムージング処理
- `formatPropertyValue()`: Entityプロパティの表示用整形

## 5. パフォーマンス最適化

1. **スロットリング**

   - カメラ変更イベント: 100ms (10FPS)
   - レンダリングループ: 150ms (約6.7FPS)
   - 重複更新防止: 30ms（カメラ変更後のレンダリング更新を最適化）
   - 最小更新間隔: 50ms

2. **位置計算の最適化**

   - 地形高さのキャッシング（LRUキャッシュ, 最大20エントリ）
   - 二段階フィルター処理:
     - 1次フィルター: 微小変動の無視（2px以内）- スムージング後
     - 2次フィルター: UI更新の間引き（1px以内）- DOM更新最適化
   - 大きな変動（40px超）は即時反映

3. **スムージング処理**
   - スムージング係数: 0.85（前回位置の影響が大きい=滑らかな移動）
   - エンティティ種類別の専用戦略による位置取得（戦略パターン）
   - `requestAnimationFrame`によるレンダリング同期

## 6. UX向上のための工夫

1. **表示モードの管理**

   - クリックモード: 固定表示（明示的に閉じるまで表示）
   - ホバーモード: カーソルの追従（hover/outに反応）

2. **クリッククールダウン**

   - クリック直後1000msはホバー処理を無視
   - 意図しないモード切り替えの防止

3. **視覚的デザイン**
   - CSSトランジションでスムーズな移動表現
   - 半透明背景でマップとの重なりを考慮
   - 指し示し矢印による参照対象の明確化

## 7. 実装上の課題と解決策

1. **地形高さの考慮**

   - 問題: 地表面と3D位置がずれる可能性
   - 解決: `sampleTerrainMostDetailed`で地形高さを取得、キャッシング

2. **ポップアップの揺れ**

   - 問題: カメラ移動でポップアップが揺れる
   - 解決: スムージングアルゴリズムと微小変動の無視

3. **更新頻度の最適化**
   - 問題: 高頻度更新によるパフォーマンス低下
   - 解決: スロットリングとCSS transitionの併用

## 8. まとめ

このポップアップシステムは、Cesiumの3D空間内で2DのHTML要素を適切に配置・表示するための複雑な課題を解決しています。主な特徴は以下の通りです：

- ユーザー操作（クリック/ホバー）の適切な処理
- 3D→2D座標変換とポップアップ位置の最適化
- パフォーマンスと応答性のバランス
- 視覚的な安定性と使いやすさの向上

これらの実装により、大規模なデータセットや複雑な地形を含むシーンでも安定したポップアップ表示が可能となっています。

## 9. TODO: 改善の余地

現在の実装は多くのシナリオで適切に動作しますが、以下の点でさらなる最適化の余地があります：

- [x] **キャッシュ管理アルゴリズムの改善**

  - 改善実施済み: 単純なMapから効率的なLRUキャッシュに変更
  - 変更点:
    - `terrainHeightCache.ts` ファイルを作成し、LRUCache<K, V>クラスを実装
    - `popupPositioning.ts` を修正して、新しいLRUキャッシュを使用（最大20エントリ）
    - `clearTerrainHeightCacheIfNeeded()` 関数を削除（LRUキャッシュは自動管理のため不要）
    - 統計情報収集機能を追加（ヒット数、ミス数、ヒット率、キャッシュサイズ監視）
  - メリット:
    - よく使われるエントリのみが保持され、最も長く使われていないエントリだけが削除される
    - 不要なキャッシュクリア処理の削除によるパフォーマンス向上
    - 将来的な診断と最適化のための統計情報の追加
  - 実装内容:

    ```typescript
    export class LRUCache<K, V> {
    	private cache = new Map<K, V>();
    	private readonly maxSize: number;
    	private hits = 0;
    	private misses = 0;

    	constructor(maxSize: number) {
    		this.maxSize = maxSize;
    	}

    	get(key: K): V | undefined {
    		// キャッシュにあれば取り出して最新に更新
    		if (this.cache.has(key)) {
    			this.hits++;
    			const value = this.cache.get(key)!;
    			// 最近使用したエントリを最新として扱うために一旦削除して再設定
    			this.cache.delete(key);
    			this.cache.set(key, value);
    			return value;
    		}

    		this.misses++;
    		return undefined;
    	}

    	set(key: K, value: V): void {
    		// すでにキーがある場合は削除
    		if (this.cache.has(key)) {
    			this.cache.delete(key);
    		}
    		// キャッシュサイズが上限に達していれば最も古いエントリを削除
    		if (this.cache.size >= this.maxSize) {
    			const oldestKey = this.cache.keys().next().value;
    			this.cache.delete(oldestKey);
    		}
    		// 新しいエントリを追加
    		this.cache.set(key, value);
    	}

    	// 統計情報を取得
    	getStats() {
    		const totalAccess = this.hits + this.misses;
    		return {
    			hits: this.hits,
    			misses: this.misses,
    			hitRatio: totalAccess > 0 ? this.hits / totalAccess : 0,
    			size: this.cache.size,
    			maxSize: this.maxSize
    		};
    	}
    }
    ```

- [x] **微小変動チェックの統合**

  - 改善実施済み: 微小変動チェックを統合し、設定値を使用するように変更
  - 変更点:
    - `popupSettings.ts`にUIの微小変動を無視する閾値を定義（secondStage）
    - `popupPositioning.ts`を修正して、ハードコードされた値(1px)を設定値(UI_UPDATE_THRESHOLD)に置き換え
    - コメントで1次フィルターと2次フィルターの役割を明確に説明
  - メリット:
    - 設定の一元管理により微調整が容易に
    - コードの意図が明確になり、保守性が向上
  - 実装内容:

    ```typescript
    // popupSettings.tsの構造
    positioning: {
      smoothingFactor: 0.85,
      thresholds: {
        firstStage: 2,  // 1次フィルター
        secondStage: 1, // 2次フィルター
        largeMovement: 40
      }
    }

    // popupPositioning.tsでの2次フィルター使用例
    if (screenPosition) {
      // 2次フィルター: UIの微小更新を防止
      if (
        Math.abs(currentPosition.x - screenPosition.x) <= UI_UPDATE_THRESHOLD &&
        Math.abs(currentPosition.y - screenPosition.y) <= UI_UPDATE_THRESHOLD
      ) {
        return currentPosition;
      }
      return screenPosition;
    }
    ```

- [x] **位置更新のイベントハンドリングの最適化**

  - 改善実施済み: イベントソース追跡による重複更新の防止機能を実装
  - 変更点:
    - `popupSettings.ts`に重複防止のための設定値を追加（duplicatePreventionDelay）
    - `PopupPositioner.svelte`にイベントソースの追跡機能を実装
    - updatePopupPosition関数を修正してイベントソース情報を追加し、短時間内の重複更新を防止
    - 設定ファイルに基づくスロットリング間隔の適用
  - メリット:
    - 同一フレーム内での重複更新を防止してパフォーマンスが向上
    - カメラ変更後すぐのレンダリングループ更新を最適化
    - 設定による動作の調整が容易に
  - 実装内容:

    ```typescript
    // popupSettings.ts に追加
    duplicatePreventionDelay: 30; // 重複防止の閾値(ms)

    // PopupPositioner.svelte
    let lastUpdateSource = '';
    let lastUpdateTime = 0;

    async function updatePopupPosition(source: 'camera' | 'renderLoop' | 'reactive' = 'reactive') {
    	// イベントソース追跡と重複更新防止
    	const now = Date.now();
    	const timeSinceLastUpdate = now - lastUpdateTime;

    	// 短時間内の重複更新を防止
    	if (
    		source === 'renderLoop' &&
    		lastUpdateSource === 'camera' &&
    		timeSinceLastUpdate < POPUP_SETTINGS.updateFrequency.duplicatePreventionDelay
    	) {
    		return; // カメラ更新直後のレンダリング更新はスキップ
    	}

    	// 位置更新処理...

    	// 更新記録
    	lastUpdateTime = now;
    	lastUpdateSource = source;
    }
    ```

- [x] **エンティティ種類ごとの位置取得処理の最適化**

  - 改善実施済み: 戦略パターンを導入してエンティティ位置取得処理を最適化
  - 変更点:
    - 新ファイル`entityPositionStrategies.ts`を作成し、異なるタイプのエンティティ位置取得戦略を実装
    - 各エンティティタイプに特化した戦略クラスを実装（ポリゴン、ビルボード、ポイント、モデルなど）
    - `getEntityPosition`関数を修正して戦略パターンを使用するように変更
  - メリット:
    - 条件分岐の複雑さを削減し、コードの可読性を向上
    - 新しいエンティティタイプのサポートが容易（新しい戦略クラスの追加のみ）
    - エンティティ位置計算ロジックが分離され、テストが容易に
    - コードの保守性が大幅に向上
  - 実装内容:

    ```typescript
    // entityPositionStrategies.ts
    export interface EntityPositionStrategy {
    	getPosition(
    		entity: CesiumType.Entity,
    		cesium: typeof CesiumType
    	): CesiumType.Cartesian3 | undefined;
    	isApplicable(entity: CesiumType.Entity): boolean;
    }

    // 各種戦略の実装例
    export class PolygonStrategy implements EntityPositionStrategy {
    	// ポリゴン用のposition取得ロジック
    }

    // entityHelpers.ts
    export function getEntityPosition(
    	entity: CesiumType.Entity,
    	cesium: typeof CesiumType
    ): CesiumType.Cartesian3 | undefined {
    	// 登録された戦略を順番に試す
    	for (const strategy of entityPositionStrategies) {
    		if (strategy.isApplicable(entity)) {
    			const position = strategy.getPosition(entity, cesium);
    			if (position) return position;
    		}
    	}
    	return undefined;
    }
    ```

## 10. ライブラリとしての使用方法と実装例

このコンポーネントシステムは、Cesium上でエンティティのプロパティをインタラクティブに表示するための再利用可能なライブラリとして設計されています。ライブラリとして使用する場合の基本的な使い方とカスタマイズ方法を以下に示します。

### 基本的な使用方法

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	// Cesiumビューワーへの参照
	let viewer: CesiumType.Viewer;
	// Cesiumモジュール
	let cesium: typeof CesiumType;

	// Cesiumの初期化（省略）
	// ...
</script>

<div id="cesiumContainer"></div>

<!-- 最もシンプルな使用方法 -->
<EntityPopup {viewer} {cesium} />
```

### カスタマイズオプション

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';
	import type { EntityPopupOptions } from 'cesium-properties-popup';

	let viewer: CesiumType.Viewer;
	let cesium: typeof CesiumType;

	// オプションを設定
	const popupOptions: EntityPopupOptions = {
		// ホバーでのポップアップ表示を有効化（デフォルトはtrue）
		enableHover: true,

		// クリック後のホバー制限時間（ミリ秒）
		clickCooldown: 1200,

		// プロパティのフィルタリング
		filterProperties: (name, value) => {
			// 特定のプロパティを除外
			return !['_id', 'id', '_entityCollection'].includes(name);
		},

		// プロパティの表示形式をカスタマイズ
		formatProperty: (name, value, cesium) => {
			// 日付型の場合は日付フォーマット
			if (name === 'timestamp' && value instanceof Date) {
				return value.toLocaleDateString('ja-JP');
			}
			// 数値の場合は桁区切りを追加
			if (typeof value === 'number') {
				return value.toLocaleString();
			}
			// デフォルトのフォーマット
			return String(value);
		},

		// ポップアップのスタイル設定
		styleOptions: {
			maxWidth: 350, // 最大幅
			maxHeight: 400, // 最大高さ
			popupClass: 'my-custom-popup' // カスタムCSSクラス
		}
	};
</script>

<EntityPopup {viewer} {cesium} options={popupOptions} />

<style>
	:global(.my-custom-popup) {
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
		border-left: 4px solid #3498db;
	}

	:global(.my-custom-popup h3) {
		color: #2c3e50;
		font-weight: bold;
	}
</style>
```

### 様々なシナリオでの利用例

#### シナリオ1: データ可視化プロジェクトでの基本的な使い方

地理データを表示するアプリケーションでは、以下のように最小限の設定でポップアップを実装できます：

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import * as Cesium from 'cesium';

	let viewer = new Cesium.Viewer('cesiumContainer');
	let cesium = Cesium;

	// GeoJSONデータをロード
	const geoJsonDataSource = Cesium.GeoJsonDataSource.load('/data/points.geojson');
	viewer.dataSources.add(geoJsonDataSource);
</script>

<div id="cesiumContainer"></div>

<EntityPopup {viewer} {cesium} />
```

このようにすると、GeoJSONデータのポイントにマウスオーバーまたはクリックした際にプロパティが自動的に表示されます。

#### シナリオ2: 特定のプロパティを強調表示するカスタマイズ

不動産データを表示するアプリケーションでは、特定のプロパティを強調表示するカスタマイズが有効です：

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import * as Cesium from 'cesium';

	let viewer = new Cesium.Viewer('cesiumContainer');
	let cesium = Cesium;

	// 重要なプロパティとその表示形式を定義
	const importantProperties = ['price', 'size', 'bedrooms', 'address'];

	const popupOptions = {
		filterProperties: (name) => importantProperties.includes(name),
		formatProperty: (name, value) => {
			if (name === 'price') {
				return `¥${Number(value).toLocaleString()}`;
			}
			if (name === 'size') {
				return `${value}㎡`;
			}
			return String(value);
		},
		styleOptions: {
			popupClass: 'real-estate-popup'
		}
	};
</script>

<EntityPopup {viewer} {cesium} options={popupOptions} />

<style>
	:global(.real-estate-popup) {
		border-left: 4px solid #e74c3c;
	}
</style>
```

#### シナリオ3: 時系列データの表示

気象データなど時系列データを扱う場合、日付や時間のフォーマット処理が重要になります：

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import * as Cesium from 'cesium';
	import { formatDate } from './utils/dateHelpers';

	let viewer = new Cesium.Viewer('cesiumContainer');
	let cesium = Cesium;

	const popupOptions = {
		formatProperty: (name, value) => {
			if (name === 'timestamp' || name === 'observed_at') {
				return formatDate(value, 'yyyy年MM月dd日 HH:mm');
			}
			if (name === 'temperature') {
				return `${value}°C`;
			}
			if (name === 'precipitation') {
				return `${value}mm`;
			}
			return String(value);
		}
	};
</script>

<EntityPopup {viewer} {cesium} options={popupOptions} />
```

#### シナリオ4: カスタムUI要素との連携

ポップアップをカスタムUI要素と連携させて、詳細情報の表示や関連アクションを提供できます：

```svelte
<script lang="ts">
	import { EntityPopup, PopupPositioner, PopupContent } from 'cesium-properties-popup';
	import * as Cesium from 'cesium';

	let viewer = new Cesium.Viewer('cesiumContainer');
	let cesium = Cesium;
	let selectedEntity = undefined;
	let isPopupOpen = false;
	let showDetailPanel = false;

	function handleEntityClick(entity) {
		selectedEntity = entity;
		isPopupOpen = true;
	}

	function showDetails() {
		showDetailPanel = true;
	}

	// エンティティのクリックイベントをハンドル
	const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	handler.setInputAction((click) => {
		const pickedObject = viewer.scene.pick(click.position);
		if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
			handleEntityClick(pickedObject.id);
		}
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<div class="custom-popup">
			<PopupContent entity={selectedEntity} {cesium} />
			<div class="actions">
				<button on:click={showDetails}>詳細を表示</button>
				<button on:click={() => (isPopupOpen = false)}>閉じる</button>
			</div>
		</div>
	</PopupPositioner>
{/if}

{#if showDetailPanel && selectedEntity}
	<div class="detail-panel">
		<h2>{selectedEntity.name || 'Entity Details'}</h2>
		<!-- 詳細情報やグラフなどを表示 -->
		<!-- ... -->
		<button on:click={() => (showDetailPanel = false)}>閉じる</button>
	</div>
{/if}

<style>
	.custom-popup {
		background-color: white;
		border-radius: 8px;
	}

	.actions {
		padding: 8px 16px;
		border-top: 1px solid #eaeaea;
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.detail-panel {
		position: absolute;
		right: 20px;
		top: 20px;
		width: 400px;
		background: white;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		padding: 16px;
	}
</style>
```

### 高度な使用方法

特定のユースケース向けに個別のコンポーネントを直接使用することもできます：

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
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<PopupContent entity={selectedEntity} {cesium} />
	</PopupPositioner>
{/if}
```

### ユーティリティ関数の利用

ライブラリが提供するユーティリティ関数を直接使用することも可能です：

```typescript
import {
	formatPropertyValue,
	getEntityPosition,
	worldPositionToScreenPosition
} from 'cesium-properties-popup';

// エンティティのプロパティ値をフォーマットする
const formattedValue = formatPropertyValue(entity.properties.myProperty, cesium);

// エンティティの3D位置を取得する
const position = getEntityPosition(entity, cesium);

// 3D座標を画面座標に変換する
const screenPosition = worldPositionToScreenPosition(position, viewer, cesium);
```

### 動的な設定変更

ライブラリはリアクティブに動作するため、オプションを動的に変更することが可能です：

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';

	// オプション
	let popupOptions = {
		enableHover: true,
		styleOptions: { maxWidth: 300 }
	};

	// ユーザー操作などに応じてオプションを変更
	function toggleHoverMode() {
		popupOptions = {
			...popupOptions,
			enableHover: !popupOptions.enableHover
		};
	}
</script>

<button on:click={toggleHoverMode}>
	ホバーモード: {popupOptions.enableHover ? 'ON' : 'OFF'}
</button>

<EntityPopup {viewer} {cesium} options={popupOptions} />
```

### デフォルト設定のカスタマイズ

アプリケーション全体でのデフォルト設定を変更することも可能です：

```typescript
import { defaultSettings } from 'cesium-properties-popup';

// カメラ変更時の更新頻度を調整（パフォーマンス最適化）
defaultSettings.updateFrequency.cameraChangeThrottle = 150; // 150ms

// レンダリングループでの更新頻度を調整
defaultSettings.updateFrequency.renderLoopThrottle = 200; // 200ms

// 重複更新防止の閾値調整
defaultSettings.updateFrequency.duplicatePreventionDelay = 50; // 50ms
```

このライブラリは、Cesium上での情報表示をカスタマイズ可能な方法で実装することを目的としており、基本的な使用方法から高度なカスタマイズまで幅広いユースケースに対応できるよう設計されています。

### API詳細

#### コンポーネント

1. **EntityPopup**

   メインコンポーネント。Cesiumビューワー上でエンティティのポップアップを管理します。

   ```typescript
   export interface EntityPopupProps {
   	viewer: CesiumType.Viewer | undefined;
   	cesium: typeof CesiumType | undefined;
   	options?: EntityPopupOptions;
   }
   ```

2. **PopupPositioner**

   ポップアップの位置決めを担当するコンポーネント。

   ```typescript
   export interface PopupPositionerProps {
   	viewer: CesiumType.Viewer | undefined;
   	cesium: typeof CesiumType | undefined;
   	entity: CesiumType.Entity | undefined;
   	isPopupOpen: boolean;
   	options?: EntityPopupOptions;
   }
   ```

3. **PopupContent**

   ポップアップの中身を表示するコンポーネント。

   ```typescript
   export interface PopupContentProps {
   	entity: CesiumType.Entity | undefined;
   	cesium: typeof CesiumType | undefined;
   	options?: EntityPopupOptions;
   }
   ```

#### インターフェース

```typescript
export interface EntityPopupOptions {
	/** ホバーでポップアップを表示するかどうか (デフォルト: true) */
	enableHover?: boolean;

	/** クリック後のホバー制限時間（ミリ秒）(デフォルト: 1000) */
	clickCooldown?: number;

	/** プロパティをフィルタリングする関数 */
	filterProperties?: (name: string, value: unknown) => boolean;

	/** プロパティの表示形式をカスタマイズする関数 */
	formatProperty?: (name: string, value: unknown, cesium?: typeof CesiumType) => string;

	/** ポップアップのCSS設定 */
	styleOptions?: {
		/** ポップアップの最大幅（px）(デフォルト: 400) */
		maxWidth?: number;
		/** ポップアップの最大高さ（px）(デフォルト: 400) */
		maxHeight?: number;
		/** ポップアップのCSSクラス */
		popupClass?: string;
	};
}
```

#### エクスポートされるユーティリティ関数

```typescript
// エンティティのプロパティ値をフォーマットする
function formatPropertyValue(value: unknown, cesium?: typeof CesiumType): string;

// エンティティから表示用のプロパティエントリを取得
function getPropertyEntries(entity: CesiumType.Entity): [string, unknown][];

// エンティティの3D位置を取得
function getEntityPosition(entity: CesiumType.Entity, cesium: typeof CesiumType): CesiumType.Cartesian3 | undefined;

// 3D座標を画面座標に変換してスムージング適用
function worldPositionToScreenPosition(
  position: CesiumType.Cartesian3,
  viewer: CesiumType.Viewer,
  cesium: typeof CesiumType,
  fallbackPosition?: { x: number; y: number }
): { x: number; y: number } | undefined;

// ポップアップの位置を計算する包括関数
function calculatePopupPosition(
  entity: CesiumType.Entity,
  viewer: CesiumType.Viewer,
  cesium: typeof CesiumType,
  currentPosition: { x: number; y: number }
): Promise<{ x: number; y: number } | undefined>;

// 高頻度イベントの処理を制限するスロットリング関数
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void;

// 地形高さデータなどをキャッシュするLRUキャッシュクラス
class LRUCache<K, V> {
  constructor(maxSize: number);

  // キャッシュから値を取得
  get(key: K): V | undefined;

  // キャッシュに値を設定
  set(key: K, value: V): void;

  // キャッシュをクリア
  clear(): void;

  // 現在のキャッシュサイズを取得
  get size(): number;

  // キーがキャッシュに存在するか確認
  has(key: K): boolean;

  // キャッシュの統計情報を取得
  getStats(): {
    hits: number;
    misses: number;
    hitRatio: number;
    size: number;
    maxSize: number;
  };
```

#### デフォルト設定

```typescript
export const POPUP_SETTINGS = {
	// 位置計算の設定
	positioning: {
		// スムージング係数 (0-1: 1に近いほど前回位置の影響が強くなる)
		smoothingFactor: 0.85,
		// フィルタリング設定
		thresholds: {
			// 1次フィルター (entityHelpers.ts)
			// スムージング後の微小変動を無視する閾値 (px) - より安定したアニメーション
			firstStage: 2,
			// 2次フィルター (popupPositioning.ts)
			// UI更新用の微小変動を無視する閾値 (px) - DOM更新を減らす
			secondStage: 1,
			// 大きな変動と見なす閾値 (px) - 即時反映される変動の閾値
			largeMovement: 40
		}
	},
	// 更新頻度の設定
	updateFrequency: {
		// カメラ変更イベントのスロットリング間隔 (ms)
		cameraChangeThrottle: 100,
		// レンダリングループのスロットリング間隔 (ms)
		renderLoopThrottle: 150,
		// イベント間の最小間隔 (ms) - これ以下の間隔で連続して呼び出された場合は後続を無視
		minUpdateInterval: 50,
		// 同一フレーム内での重複更新防止のデバウンス時間 (ms)
		duplicatePreventionDelay: 30
	}
};
```

## 11. 実装ガイドラインとベストプラクティス

このライブラリを効果的に使用するためのガイドラインとベストプラクティスを以下に示します。

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
   	formatProperty: (name, value) => {
   		if (typeof value === 'object' && value !== null) {
   			if (name === 'attributes' || name === 'metadata') {
   				return '[詳細を表示...]'; // クリックで詳細表示などの処理
   			}
   			return JSON.stringify(value).substring(0, 100) + '...';
   		}
   		return String(value);
   	}
   };
   ```

3. **位置更新頻度の調整**

   ```typescript
   import { defaultSettings } from 'cesium-properties-popup';

   // 低スペックデバイス向けの最適化
   defaultSettings.updateFrequency.cameraChangeThrottle = 200; // 200ms
   defaultSettings.updateFrequency.renderLoopThrottle = 250; // 250ms
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

### 実装例: 詳細情報パネル連携

カスタムUIと連携して、選択されたエンティティの詳細情報を表示するパターン：

```svelte
<script lang="ts">
  import { EntityPopup, getPropertyEntries } from 'cesium-properties-popup';
  import * as Cesium from 'cesium';

  let viewer = new Cesium.Viewer('cesiumContainer');
  let cesium = Cesium;
  let selectedEntity = null;
  let showDetailPanel = false;

  // カスタムイベントハンドラ
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const pickedObject = viewer.scene.pick(click.position);
    if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
      selectedEntity = pickedObject.id;
      showDetailPanel = true;
    } else {
      selectedEntity = null;
      showDetailPanel = false;
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 詳細データを取得
  $: detailData = selectedEntity ? getPropertyEntries(selectedEntity) : [];

  function closeDetails() {
    showDetailPanel = false;
  }

  // ホバーでのプレビュー表示
  const popupOptions = {
    enableHover: true,
    clickCooldown: 1000
  };
</script>

<div id="cesiumContainer"></div>

<!-- ホバープレビュー用ポップアップ -->
<EntityPopup {viewer} {cesium} options={popupOptions} />

<!-- 詳細パネル -->
{#if showDetailPanel && selectedEntity}
  <div class="detail-panel">
    <div class="header">
      <h2>{selectedEntity.name || '詳細情報'}</h2>
      <button on:click={closeDetails}>×</button>
    </div>

    <div class="content">
      <div class="properties">
        <table>
          <tbody>
            {#each detailData as [key, value]}
              <tr>
                <td>{key}</td>
                <td>{String(value)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- カスタムコントロール -->
      <div class="actions">
        <button on:click={() => /* ズーム処理 */ }>ズーム</button>
        <button on:click={() => /* 編集処理 */ }>編集</button>
        <button on:click={() => /* データ分析 */ }>分析</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .detail-panel {
    position: absolute;
    right: 20px;
    top: 20px;
    width: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
  }

  .content {
    padding: 16px;
  }

  .properties {
    max-height: 300px;
    overflow-y: auto;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }
</style>
```

### 実装例: データ可視化の拡張

時系列データを含むエンティティに対して、グラフ表示と連携する例：

```svelte
<script lang="ts">
	import { EntityPopup, PopupPositioner, PopupContent } from 'cesium-properties-popup';
	import * as Cesium from 'cesium';
	import { LineChart } from './components/charts';

	let viewer = new Cesium.Viewer('cesiumContainer');
	let cesium = Cesium;
	let selectedEntity = null;
	let timeSeriesData = [];

	// 選択したエンティティの時系列データを取得
	async function fetchTimeSeriesData(entityId) {
		try {
			const response = await fetch(`/api/timeseries/${entityId}`);
			return await response.json();
		} catch (error) {
			console.error('時系列データ取得エラー:', error);
			return [];
		}
	}

	// エンティティ選択時の処理
	async function handleEntitySelect(entity) {
		selectedEntity = entity;
		if (entity && entity.id) {
			timeSeriesData = await fetchTimeSeriesData(entity.id);
		}
	}

	// カスタムの選択ハンドラ
	const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	handler.setInputAction(async (click) => {
		const pickedObject = viewer.scene.pick(click.position);
		if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
			await handleEntitySelect(pickedObject.id);
		} else {
			selectedEntity = null;
			timeSeriesData = [];
		}
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
</script>

<div id="cesiumContainer"></div>

<!-- 基本的なポップアップ（ホバー用） -->
<EntityPopup {viewer} {cesium} options={{ enableHover: true }} />

<!-- カスタムポップアップ（クリック選択時） -->
{#if selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} isPopupOpen={true}>
		<div class="custom-popup">
			<div class="popup-header">
				<h3>{selectedEntity.name || 'データポイント'}</h3>
			</div>

			<div class="popup-content">
				<!-- 基本プロパティ -->
				<PopupContent entity={selectedEntity} {cesium} />

				<!-- 時系列データのグラフ表示 -->
				{#if timeSeriesData.length > 0}
					<div class="chart-container">
						<h4>時系列データ</h4>
						<LineChart data={timeSeriesData} />
					</div>
				{/if}
			</div>
		</div>
	</PopupPositioner>
{/if}

<style>
	.custom-popup {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 15px rgba(0, 0, 0, 0.2);
		min-width: 300px;
		max-width: 500px;
	}

	.popup-header {
		background: #f8f8f8;
		padding: 10px 15px;
		border-bottom: 1px solid #eee;
		border-radius: 8px 8px 0 0;
	}

	.popup-content {
		padding: 15px;
	}

	.chart-container {
		margin-top: 15px;
		border-top: 1px solid #eee;
		padding-top: 15px;
	}
</style>
```

### ライブラリの応用範囲

このライブラリは、以下のようなさまざまなシナリオで活用できます：

1. **GIS アプリケーション**

   - 地形データの表示と分析
   - 地理的特性の視覚化
   - 地理情報システムの情報表示

2. **都市計画・スマートシティ**

   - 建築物情報の表示
   - 都市インフラの管理
   - センサーデータの可視化

3. **防災・減災システム**

   - ハザードマップの情報表示
   - リアルタイム災害情報の提供
   - 避難経路の案内

4. **気象データ可視化**

   - 気象センサーデータの表示
   - 予測モデルの結果表示
   - 気象変動の時系列表示

5. **不動産・施設管理**
   - 物件情報の表示
   - 施設管理データの閲覧
   - 空間利用状況の分析

各シナリオに合わせて、ポップアップの表示内容や動作をカスタマイズすることで、多様なニーズに対応できます。

```

```
