import type * as CesiumType from 'cesium';
import { getEntityPosition, worldPositionToScreenPosition } from './entityHelpers';
import { LRUCache } from './terrainHeightCache';
import { POPUP_SETTINGS } from './popupSettings';

// Maintain terrain height in LRU cache (max 20 entries)
const terrainHeightCache = new LRUCache<string, number>(20);

// Threshold for secondary filter (prevent minor UI updates)
const UI_UPDATE_THRESHOLD = POPUP_SETTINGS.positioning.thresholds.secondStage;

/**
 * Function to update popup position based on feature location
 *
 * @param selectedEntity Selected entity
 * @param viewer Cesium viewer
 * @param cesium Reference to the Cesium library
 * @param currentPosition Current popup position
 * @returns Updated popup position, or undefined if calculation is not possible
 */
export async function calculatePopupPosition(
	selectedEntity: CesiumType.Entity,
	viewer: CesiumType.Viewer,
	cesium: typeof CesiumType,
	currentPosition: { x: number; y: number }
): Promise<{ x: number; y: number } | undefined> {
	if (!selectedEntity || !viewer || !cesium) return undefined;

	try {
		// Get 3D coordinates of the feature
		const entityPosition = getEntityPosition(selectedEntity, cesium);
		if (!entityPosition) return undefined;

		// Convert to Cartographic coordinates (needed for terrain sampling)
		const cartographic = cesium.Cartographic.fromCartesian(entityPosition);
		if (!cartographic) return undefined;

		// Position calculation considering terrain height
		let terrainHeight = 0;

		// Create cache key (entity ID)
		const entityId = String(selectedEntity.id);

		if (viewer.terrainProvider) {
			// Check if height is in cache
			if (terrainHeightCache.has(entityId)) {
				// Get from cache
				terrainHeight = terrainHeightCache.get(entityId)!;
			} else {
				try {
					// Sample terrain to get height
					const terrainSamplePositions = [cartographic];
					// First try detailed terrain information
					try {
						const updatedPositions = await cesium.sampleTerrainMostDetailed(
							viewer.terrainProvider,
							terrainSamplePositions
						);
						// 地形高さを取得
						terrainHeight = updatedPositions[0].height || 0;
					} catch (detailedError) {
						// If detailed method fails, try a simpler approach
						console.warn(
							'Detailed terrain sampling failed, trying standard method:',
							detailedError
						);
						try {
							// Get terrain elevation (level 9 - more stable calculation)
							const level9Positions = await cesium.sampleTerrain(
								viewer.terrainProvider,
								9, // More stable level
								terrainSamplePositions
							);
							terrainHeight = level9Positions[0].height || 0;
						} catch (simpleError) {
							console.warn('Terrain sampling failed:', simpleError);
						}
					}

					// Save to cache
					terrainHeightCache.set(entityId, terrainHeight);
				} catch (error) {
					console.warn('Error during terrain sampling:', error);
				}
			}

			// If entity is below ground, use ground height
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
		const maxOffset = 500; // Maximum offset (meters)
		const distanceFactor = 0.05; // 5% of distance (larger offset)

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
		console.error('Error during popup position update:', error);
		return undefined;
	}
}
