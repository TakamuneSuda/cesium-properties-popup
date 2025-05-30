/**
 * エンティティ位置取得のための戦略パターン実装
 * 様々なタイプのエンティティから3D位置を取得するための特化したロジックを提供
 */
import type * as CesiumType from 'cesium';

/**
 * 値がCesiumのPropertyオブジェクトかどうかを判定する型ガード
 * @param value 検証する値
 * @returns Cesiumのプロパティオブジェクトかどうか
 */
function isCesiumProperty(value: unknown): value is CesiumType.Property {
	return (
		value !== null &&
		typeof value === 'object' &&
		'getValue' in value &&
		typeof (value as { getValue?: unknown }).getValue === 'function'
	);
}

/**
 * エンティティポジション戦略のインターフェース
 */
export interface EntityPositionStrategy {
	/**
	 * エンティティから3D位置を取得する
	 * @param entity 対象エンティティ
	 * @param cesium Cesiumライブラリ
	 * @returns 3D位置座標(Cartesian3)または取得できない場合はundefined
	 */
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined;

	/**
	 * 戦略が適用可能かどうか判定する
	 * @param entity 判定対象エンティティ
	 * @returns 適用可能ならtrue
	 */
	isApplicable(entity: CesiumType.Entity): boolean;
}

/**
 * 標準位置プロパティを持つエンティティ用戦略
 */
export class StandardPositionStrategy implements EntityPositionStrategy {
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined {
		if (!entity.position) return undefined;

		try {
			const property = entity.position;
			if (isCesiumProperty(property)) {
				const julianDate = cesium.JulianDate.now();
				return property.getValue(julianDate);
			}
		} catch (e: unknown) {
			console.error('標準位置取得エラー:', e instanceof Error ? e.message : String(e));
		}
		return undefined;
	}

	isApplicable(entity: CesiumType.Entity): boolean {
		return !!entity.position;
	}
}

/**
 * ポリゴンエンティティ用戦略
 */
export class PolygonStrategy implements EntityPositionStrategy {
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined {
		if (!entity.polygon?.hierarchy) return undefined;

		try {
			const julianDate = cesium.JulianDate.now();
			const hierarchy = entity.polygon.hierarchy.getValue(julianDate);
			if (hierarchy && hierarchy.positions) {
				// ポリゴンの中心点を計算
				return cesium.BoundingSphere.fromPoints(hierarchy.positions).center;
			}
		} catch (e: unknown) {
			console.error('ポリゴン中心点計算エラー:', e instanceof Error ? e.message : String(e));
		}
		return undefined;
	}

	isApplicable(entity: CesiumType.Entity): boolean {
		return !!entity.polygon && !!entity.polygon.hierarchy;
	}
}

/**
 * ポリラインエンティティ用戦略
 */
export class PolylineStrategy implements EntityPositionStrategy {
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined {
		if (!entity.polyline?.positions) return undefined;

		try {
			const julianDate = cesium.JulianDate.now();
			const property = entity.polyline.positions;

			let positions: CesiumType.Cartesian3[] | undefined;

			// プロパティがCesiumのPropertyオブジェクトかどうかチェック
			if (isCesiumProperty(property)) {
				positions = property.getValue(julianDate);
			} else if (Array.isArray(property)) {
				positions = property;
			}

			if (!positions || positions.length === 0) {
				return undefined;
			}

			// 単一点の場合はその点を返す
			if (positions.length === 1) {
				return positions[0];
			}

			// 複数点の場合は中点を計算
			const midIndex = Math.floor(positions.length / 2);
			return positions[midIndex];
		} catch (e: unknown) {
			console.error('ポリライン位置取得エラー:', e instanceof Error ? e.message : String(e));
		}
		return undefined;
	}

	isApplicable(entity: CesiumType.Entity): boolean {
		return !!entity.polyline && !!entity.polyline.positions;
	}
}

/**
 * ビルボードエンティティ用戦略
 */
export class BillboardStrategy implements EntityPositionStrategy {
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined {
		if (!entity.position) return undefined;

		try {
			const julianDate = cesium.JulianDate.now();
			const property = entity.position;
			if (isCesiumProperty(property)) {
				return property.getValue(julianDate);
			}
		} catch (e: unknown) {
			console.error('ビルボード位置取得エラー:', e instanceof Error ? e.message : String(e));
		}
		return undefined;
	}

	isApplicable(entity: CesiumType.Entity): boolean {
		return !!entity.billboard;
	}
}

/**
 * ポイントエンティティ用戦略
 */
export class PointStrategy implements EntityPositionStrategy {
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined {
		if (!entity.position) return undefined;

		try {
			const julianDate = cesium.JulianDate.now();
			const property = entity.position;
			if (isCesiumProperty(property)) {
				return property.getValue(julianDate);
			}
		} catch (e: unknown) {
			console.error('ポイント位置取得エラー:', e instanceof Error ? e.message : String(e));
		}
		return undefined;
	}

	isApplicable(entity: CesiumType.Entity): boolean {
		return !!entity.point;
	}
}

/**
 * モデルエンティティ用戦略
 */
export class ModelStrategy implements EntityPositionStrategy {
	getPosition(
		entity: CesiumType.Entity,
		cesium: typeof CesiumType
	): CesiumType.Cartesian3 | undefined {
		if (!entity.position) return undefined;

		try {
			const julianDate = cesium.JulianDate.now();
			const property = entity.position;
			if (isCesiumProperty(property)) {
				return property.getValue(julianDate);
			}
		} catch (e: unknown) {
			console.error('モデル位置取得エラー:', e instanceof Error ? e.message : String(e));
		}
		return undefined;
	}

	isApplicable(entity: CesiumType.Entity): boolean {
		return !!entity.model;
	}
}

/**
 * 各種エンティティ位置取得戦略のコレクション
 */
export const entityPositionStrategies: EntityPositionStrategy[] = [
	new PolygonStrategy(),
	new PolylineStrategy(),
	new BillboardStrategy(),
	new PointStrategy(),
	new ModelStrategy(),
	new StandardPositionStrategy() // 最後にフォールバックとして標準位置戦略
];
