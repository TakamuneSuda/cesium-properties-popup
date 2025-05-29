import type * as CesiumType from 'cesium';
import { getEntityPosition, worldPositionToScreenPosition } from './entityHelpers';
import { LRUCache } from './terrainHeightCache';
import { POPUP_SETTINGS } from './popupSettings';

// 地形高さのキャッシュをLRUキャッシュで保持（最大20エントリ）
const terrainHeightCache = new LRUCache<string, number>(20);

// 2次フィルター用の閾値（UIの微小更新を防止）
const UI_UPDATE_THRESHOLD = POPUP_SETTINGS.positioning.thresholds.secondStage;

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
					// まずは詳細な地形情報を試す
					try {
						const updatedPositions = await cesium.sampleTerrainMostDetailed(
							viewer.terrainProvider,
							terrainSamplePositions
						);
						// 地形高さを取得
						terrainHeight = updatedPositions[0].height || 0;
					} catch (detailedError) {
						// 詳細な方法が失敗したら、より単純な方法を試す
						console.warn('詳細な地形取得に失敗、標準方法で再試行します:', detailedError);
						try {
							// 地形の標高を取得（レベル9 - より安定した計算）
							const level9Positions = await cesium.sampleTerrain(
								viewer.terrainProvider,
								9, // より安定したレベル
								terrainSamplePositions
							);
							terrainHeight = level9Positions[0].height || 0;
						} catch (simpleError) {
							console.warn('地形取得に失敗:', simpleError);
						}
					}

					// キャッシュに保存
					terrainHeightCache.set(entityId, terrainHeight);
				} catch (error) {
					console.warn('地形サンプリング中にエラーが発生:', error);
				}
			}

			// エンティティが地表より下にある場合は地表の高さを使用
			if (cartographic.height < terrainHeight) {
				cartographic.height = terrainHeight;
			}
		}

		// 更新されたCartographicをCartesianに戻す
		const positionWithTerrain = cesium.Cartographic.toCartesian(cartographic);

		// カメラからの距離に応じてオフセットを動的に調整
		const cameraDistance = cesium.Cartesian3.distance(viewer.camera.position, positionWithTerrain);

		// 距離に応じたスケール係数の計算を改良
		// 1. 近距離では大きめのオフセットを使用（より見やすく）
		// 2. 中・遠距離では距離に比例したオフセット
		// 3. オフセットに上限を設ける（遠すぎる場合に巨大なオフセットを防止）
		const minOffset = 15; // 最小オフセット（メートル）
		const maxOffset = 500; // 最大オフセット（メートル）
		const distanceFactor = 0.05; // 距離の5%（より大きめのオフセット）

		// オフセット計算: 最小値と最大値の間に収まるよう制限
		const offsetScale = Math.min(Math.max(cameraDistance * distanceFactor, minOffset), maxOffset);

		// オフセット位置を計算（地物の上方に表示）- 調整済みオフセットを使用
		const offsetPosition = cesium.Cartesian3.add(
			positionWithTerrain,
			new cesium.Cartesian3(0, 0, offsetScale),
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

		return currentPosition;
	} catch (error) {
		console.error('ポップアップ位置更新中にエラーが発生しました:', error);
		return undefined;
	}
}
