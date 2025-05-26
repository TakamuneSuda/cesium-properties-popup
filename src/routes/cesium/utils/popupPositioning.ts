import type * as CesiumType from 'cesium';
import { getEntityPosition, worldPositionToScreenPosition } from './entityHelpers';

// 地形高さのキャッシュを保持するマップ
let terrainHeightCache: Map<string, number> = new Map();

/**
 * キャッシュのクリア処理
 * キャッシュサイズが閾値を超えた場合にクリアします
 */
export function clearTerrainHeightCacheIfNeeded() {
	if (terrainHeightCache.size > 20) {
		// 20個以上のキャッシュがたまったらクリア
		terrainHeightCache = new Map();
	}
}

/**
 * 地物の位置に基づいてポップアップ位置を更新する関数
 *
 * @param selectedEntity 選択されたエンティティ
 * @param viewer Cesiumビューア
 * @param cesium Cesiumライブラリの参照
 * @param currentPosition 現在のポップアップ位置
 * @returns 更新されたポップアップ位置、または計算できない場合はundefined
 */
export async function calculatePopupPosition(
	selectedEntity: CesiumType.Entity,
	viewer: CesiumType.Viewer,
	cesium: typeof CesiumType,
	currentPosition: { x: number; y: number }
): Promise<{ x: number; y: number } | undefined> {
	if (!selectedEntity || !viewer || !cesium) return undefined;

	try {
		// 地物の3D座標を取得
		const entityPosition = getEntityPosition(selectedEntity, cesium);
		if (!entityPosition) return undefined;

		// Cartographic座標に変換（地形サンプリングのために必要）
		const cartographic = cesium.Cartographic.fromCartesian(entityPosition);
		if (!cartographic) return undefined;

		// 地形の高さを考慮した位置計算
		let terrainHeight = 0;

		// キャッシュキーを作成 (エンティティID)
		const entityId = String(selectedEntity.id);

		if (viewer.terrainProvider) {
			// キャッシュにあるか確認
			if (terrainHeightCache.has(entityId)) {
				// キャッシュから取得
				terrainHeight = terrainHeightCache.get(entityId)!;
			} else {
				try {
					// 地形の高さを取得するためのサンプリング
					const terrainSamplePositions = [cartographic];
					const updatedPositions = await cesium.sampleTerrainMostDetailed(
						viewer.terrainProvider,
						terrainSamplePositions
					);

					// 地形高さを取得
					terrainHeight = updatedPositions[0].height || 0;

					// キャッシュに保存
					terrainHeightCache.set(entityId, terrainHeight);
				} catch (error) {
					console.warn('地形サンプリング中にエラーが発生:', error);
				}
			}

			// 元の位置より地形高さの方が高い場合は地形高さを使用
			cartographic.height = Math.max(cartographic.height, terrainHeight);
		}

		// 更新されたCartographicをCartesianに戻す
		const positionWithTerrain = cesium.Cartographic.toCartesian(cartographic);

		// カメラからの距離に応じてオフセットを動的に調整
		const cameraDistance = cesium.Cartesian3.distance(viewer.camera.position, positionWithTerrain);

		// 距離に応じたスケール係数
		// より適切なスケーリング - 近すぎず、遠すぎない適切なオフセット
		const offsetScale = Math.max(cameraDistance * 0.04, 10); // 最小10m、距離の4%

		// オフセット位置を計算（地物の上方に表示）
		const offsetPosition = cesium.Cartesian3.add(
			positionWithTerrain,
			new cesium.Cartesian3(0, 0, offsetScale), // 動的なZ方向オフセット
			new cesium.Cartesian3()
		);

		// より正確な座標変換のためのメソッド選択
		// worldToWindowCoordinatesはシーン内の位置を画面座標に変換
		const screenPosition = worldPositionToScreenPosition(
			offsetPosition,
			viewer,
			cesium,
			currentPosition
		);
		if (!screenPosition) return undefined;

		// ポップアップ位置を更新
		// worldPositionToScreenPosition関数でスムージングが強化されたため、
		// ここでは別途の補間処理は行わず、そのまま位置を返す
		if (screenPosition) {
			// 極めて小さな変動（1px以内）は更新しない
			if (
				Math.abs(currentPosition.x - screenPosition.x) <= 1 &&
				Math.abs(currentPosition.y - screenPosition.y) <= 1
			) {
				return currentPosition;
			}
			return screenPosition;
		}

		return currentPosition;
	} catch (error) {
		console.error('ポップアップ位置更新中にエラーが発生しました:', error);
		return undefined;
	}
}
