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

2. **位置計算の最適化**

   - 地形高さのキャッシング
   - 微小変動の無視（1px以内）
   - 大きな変動（40px超）は即時反映

3. **スムージング処理**
   - `SMOOTHING_FACTOR = 0.85`: 前回位置の影響が大きい（滑らかな移動）
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
    - `popupPositioning.ts` を修正して、新しいLRUキャッシュを使用
    - `clearTerrainHeightCacheIfNeeded()` 関数を削除（LRUキャッシュは自動管理のため不要）
    - 統計情報収集機能を追加（ヒット数、ミス数、ヒット率）
  - メリット:
    - よく使われるエントリのみが保持され、最も長く使われていないエントリだけが削除される
    - 不要なキャッシュクリア処理の削除によるパフォーマンス向上
    - 将来的な診断と最適化のための統計情報の追加
  - 実装内容:

    ```typescript
    export class LRUCache<K, V> {
    	private cache = new Map<K, V>();
    	private readonly maxSize: number;

    	constructor(maxSize: number) {
    		this.maxSize = maxSize;
    	}

    	get(key: K): V | undefined {
    		// キャッシュにあれば取り出して最新に更新
    		if (this.cache.has(key)) {
    			const value = this.cache.get(key)!;
    			this.cache.delete(key);
    			this.cache.set(key, value);
    			return value;
    		}
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
    // popupPositioning.ts
    if (screenPosition) {
    	// 2次フィルター: UIの微小更新を防止
    	// DOMの更新頻度を減らすためのフィルター（設定値を使用）
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
