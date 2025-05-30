# Cesium Properties Popup - Line Entity Popup Issue Investigation Report

## 調査日

2025年5月30日

## 問題の概要

`Entities.svelte`で作成されたpoint、polygonエンティティに対してはpopupが正常に表示されるが、lineエンティティに対してはpopupが表示されない問題が発生している。

## 調査結果

### 根本原因の特定

調査の結果、問題の根本原因は**`entityPositionStrategies.ts`にPolylineStrategy（線エンティティ用の位置計算戦略）が実装されていない**ことにあります。

### 詳細な調査結果

#### 1. ライブラリの構造分析

- **`entityHelpers.ts`**: 戦略パターンを使用してエンティティの位置計算を行う
- **`entityPositionStrategies.ts`**: 各エンティティタイプに対応する位置計算戦略を定義
- **`popupPositioning.ts`**: `getEntityPosition()`を呼び出してポップアップの位置を決定

#### 2. 現在実装されている戦略

```typescript
// entityPositionStrategies.ts の内容
- PolygonStrategy: ポリゴンエンティティの中心点計算
- BillboardStrategy: ビルボードエンティティの位置取得
- PointStrategy: ポイントエンティティの位置取得
- ModelStrategy: 3Dモデルエンティティの位置取得
- StandardStrategy: デフォルトの位置取得（entity.position）
```

#### 3. 問題の発生メカニズム

1. ユーザーがlineエンティティをクリック/ホバー
2. `popupPositioning.ts`の`getEntityPosition()`が呼び出される
3. `entityHelpers.ts`の戦略パターンによる位置計算が実行される
4. **PolylineStrategyが存在しないため、適切な位置計算ができない**
5. ポップアップの位置が決定できず、表示されない

#### 4. コード解析詳細

**`entityHelpers.ts`の戦略登録部分:**

```typescript
const strategies: EntityPositionStrategy[] = [
	new PolygonStrategy(),
	new BillboardStrategy(),
	new PointStrategy(),
	new ModelStrategy(),
	new StandardStrategy()
];
// ⚠️ PolylineStrategyが登録されていない
```

**`getEntityPosition()`の動作:**

```typescript
export function getEntityPosition(entity: Entity, viewer: Viewer): Cartesian3 | undefined {
	for (const strategy of strategies) {
		if (strategy.canHandle(entity)) {
			return strategy.getPosition(entity, viewer);
		}
	}
	return undefined; // ⚠️ 適切な戦略が見つからない場合はundefinedを返す
}
```

## 修正案

### 1. PolylineStrategy の実装

`entityPositionStrategies.ts`に以下のPolylineStrategyクラスを追加する必要があります：

```typescript
export class PolylineStrategy implements EntityPositionStrategy {
	canHandle(entity: Entity): boolean {
		return entity.polyline !== undefined;
	}

	getPosition(entity: Entity, viewer: Viewer): Cartesian3 | undefined {
		if (!entity.polyline?.positions) {
			return undefined;
		}

		const positions = entity.polyline.positions.getValue(viewer.clock.currentTime);
		if (!positions || positions.length === 0) {
			return undefined;
		}

		// 線の中点を計算
		if (positions.length === 1) {
			return positions[0];
		}

		// 複数の点がある場合は中点を計算
		const midIndex = Math.floor(positions.length / 2);
		return positions[midIndex];
	}
}
```

### 2. 戦略の登録

`entityHelpers.ts`の戦略配列にPolylineStrategyを追加：

```typescript
const strategies: EntityPositionStrategy[] = [
	new PolygonStrategy(),
	new PolylineStrategy(), // ← 追加
	new BillboardStrategy(),
	new PointStrategy(),
	new ModelStrategy(),
	new StandardStrategy()
];
```

### 3. 実装時の考慮事項

#### A. 位置計算方法の選択肢

1. **中点方式（推奨）**: 線の中央の点を使用
2. **重心方式**: 全ての点の平均位置を計算
3. **クリック位置方式**: ユーザーがクリックした最も近い点を使用

#### B. エラーハンドリング

- `positions`が動的プロパティの場合の時間値処理
- 空の配列や無効な位置データの処理
- 非表示エンティティの処理

#### C. パフォーマンス最適化

- 大量の頂点を持つ線の場合の計算効率化
- キャッシュ機能の検討

## 推奨実装順序

1. **Phase 1**: 基本的なPolylineStrategyの実装（中点方式）
2. **Phase 2**: エラーハンドリングの強化
3. **Phase 3**: パフォーマンス最適化（必要に応じて）

## テスト計画

### 1. 基本機能テスト

- [ ] 2点間の線でポップアップが表示される
- [ ] 複数点の線でポップアップが中点に表示される
- [ ] ホバー時とクリック時の両方でポップアップが機能する

### 2. エッジケースのテスト

- [ ] 1点のみの線（退化した線）
- [ ] 空の位置配列
- [ ] 動的に変化する線の位置

### 3. 既存機能の回帰テスト

- [ ] Point、Polygonエンティティのポップアップが引き続き動作
- [ ] 他のエンティティタイプに影響がない

## 結論

この問題は明確に特定できる設計上の欠陥であり、PolylineStrategyの実装により解決可能です。修正は比較的単純で、既存のコードベースとの整合性も保たれます。実装後は、すべてのエンティティタイプ（point、polygon、line）で一貫したポップアップ機能が提供されるようになります。
