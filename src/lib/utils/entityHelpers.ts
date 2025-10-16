import type * as CesiumType from 'cesium';
import { POPUP_SETTINGS } from './popupSettings';
import { entityPositionStrategies } from './entityPositionStrategies';

/**
 * Type guard to check if a value is a Cesium Property object
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
 * PropertyBag type with index signature for properties
 */
export interface PropertyBagWithIndex {
	[key: string]: unknown;
	propertyNames?: string[];
	getValue?: (propertyName: string) => unknown;
}

/**
 * Function to get the 3D coordinates of a feature
 * Uses the strategy pattern to handle different types of entities
 *
 * @param entity The entity to get coordinates from
 * @param cesium Reference to the Cesium library
 * @returns The entity's 3D coordinates, or undefined if not available
 */
export function getEntityPosition(
	entity: CesiumType.Entity,
	cesium: typeof CesiumType
): CesiumType.Cartesian3 | undefined {
	if (!entity || !cesium) return undefined;

	// Try registered strategies in order
	for (const strategy of entityPositionStrategies) {
		if (strategy.isApplicable(entity)) {
			const position = strategy.getPosition(entity, cesium);
			if (position) return position;
		}
	}

	return undefined;
}

/**
 * Interface representing screen coordinates
 */
interface ScreenPosition {
	x: number;
	y: number;
}

/**
 * Function to convert 3D coordinates to screen coordinates
 *
 * @param position 3D world coordinates
 * @param viewer Cesium viewer
 * @param cesium Reference to the Cesium library
 * @param fallbackPosition Alternative position in case of error
 * @returns Screen coordinates, or undefined if conversion is not possible
 */

// Static variable to hold the last calculated position (for smoothing)
let lastCalculatedPosition: ScreenPosition | undefined = undefined;
// Load settings
const SMOOTHING_FACTOR = POPUP_SETTINGS.positioning.smoothingFactor;
// Threshold to ignore small movements (in pixels) - first stage filter
const MOVEMENT_THRESHOLD = POPUP_SETTINGS.positioning.thresholds.firstStage;
// Threshold to determine large movements (in pixels) - changes above this value are reflected immediately
const LARGE_MOVEMENT_THRESHOLD = POPUP_SETTINGS.positioning.thresholds.largeMovement;

export function worldPositionToScreenPosition(
	position: CesiumType.Cartesian3,
	viewer: CesiumType.Viewer,
	cesium: typeof CesiumType,
	fallbackPosition?: ScreenPosition
): ScreenPosition | undefined {
	if (!viewer || !cesium || !position) return undefined;

	try {
		// Check if world coordinates are within the viewport
		const inViewport =
			viewer.scene.camera.frustum
				.computeCullingVolume(
					viewer.scene.camera.position,
					viewer.scene.camera.direction,
					viewer.scene.camera.up
				)
				.computeVisibility(new cesium.BoundingSphere(position, 1.0)) !== cesium.Intersect.OUTSIDE;

		// Return undefined and hide popup if entity is outside viewport
		if (!inViewport) {
			return undefined;
		}

		// -------- Convert 3D world coordinates to screen coordinates --------
		// First try standard conversion
		const screenPosition = cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, position);

		if (!screenPosition) {
			// If standard method fails, try alternative calculation
			console.warn('Standard coordinate conversion failed, attempting alternative calculation');
			if (fallbackPosition) return fallbackPosition;
			return undefined;
		}

		// Calculated raw coordinate values (truncated to integer)
		const rawX = Math.floor(screenPosition.x);
		const rawY = Math.floor(screenPosition.y);

		// Check if not off-screen with margin (check screen edges with buffer)
		const canvas = viewer.scene.canvas;
		// Acceptable margin for off-screen elements (proportion of screen size)
		const marginFactor = 0.5; // Allow up to 50% of screen size
		const marginX = canvas.clientWidth * marginFactor;
		const marginY = canvas.clientHeight * marginFactor;

		const isOffscreen =
			rawX < -marginX ||
			rawY < -marginY ||
			rawX > canvas.clientWidth + marginX ||
			rawY > canvas.clientHeight + marginY;

		// Return undefined to hide popup if entity is outside acceptable screen margins
		if (isOffscreen) {
			return undefined; // Hide popup when entity is too far off-screen
		}

		// 初回実行時またはfallbackPositionがない場合
		if (!lastCalculatedPosition || !fallbackPosition) {
			lastCalculatedPosition = { x: rawX, y: rawY };
			return lastCalculatedPosition;
		}

		// 大きな変動がある場合は即時に位置を更新（ジャンプが必要）
		if (
			Math.abs(fallbackPosition.x - rawX) > LARGE_MOVEMENT_THRESHOLD ||
			Math.abs(fallbackPosition.y - rawY) > LARGE_MOVEMENT_THRESHOLD
		) {
			lastCalculatedPosition = { x: rawX, y: rawY };
			return lastCalculatedPosition;
		}

		// アダプティブスムージング - カメラの動きが速い時はスムージングを弱く
		const cameraMovementSpeed = cesium.Cartesian3.magnitude(viewer.scene.camera.positionWC);
		// 動きが速いほど小さい値に（より即座に位置が反映される）
		const adaptiveSmoothingFactor = Math.max(
			0.5,
			Math.min(SMOOTHING_FACTOR, SMOOTHING_FACTOR - cameraMovementSpeed * 0.0001)
		);

		// スムージング処理（前回の位置と新しい位置を混合）
		const smoothedX = Math.floor(
			fallbackPosition.x * adaptiveSmoothingFactor + rawX * (1 - adaptiveSmoothingFactor)
		);
		const smoothedY = Math.floor(
			fallbackPosition.y * adaptiveSmoothingFactor + rawY * (1 - adaptiveSmoothingFactor)
		);

		// 1次フィルター: スムージング処理後の微小変動（閾値以下）を抑制
		// これにより座標計算の揺らぎによる細かいジッターを防止し、動きを安定させる
		if (
			Math.abs(fallbackPosition.x - smoothedX) <= MOVEMENT_THRESHOLD &&
			Math.abs(fallbackPosition.y - smoothedY) <= MOVEMENT_THRESHOLD
		) {
			return fallbackPosition;
		}

		// 更新された位置を保存して返す
		lastCalculatedPosition = { x: smoothedX, y: smoothedY };
		return lastCalculatedPosition;
	} catch (e: unknown) {
		console.error('Coordinate conversion error:', e instanceof Error ? e.message : String(e));

		// Try to recover from error by using the last valid position if available
		if (fallbackPosition && fallbackPosition.x !== 0 && fallbackPosition.y !== 0) {
			return fallbackPosition;
		}
		return undefined;
	}
}

/**
 * Helper function to get property value as string
 *
 * @param value Value to stringify (Cesium Property object or other value)
 * @param cesium Reference to Cesium library (optional)
 * @returns Stringified value
 */
export function formatPropertyValue(value: unknown, cesium?: typeof CesiumType): string {
	if (value === undefined || value === null) return '';

	// Cesium Propertyオブジェクトの場合
	if (typeof value === 'object' && value !== null) {
		// Cesium Property オブジェクトの場合
		if (isCesiumProperty(value)) {
			try {
				const julianDate = cesium?.JulianDate.now();
				if (julianDate) {
					const resolvedValue = value.getValue(julianDate);
					return resolvedValue !== undefined ? String(resolvedValue) : '';
				}
			} catch {
				// エラー時は標準の文字列変換を試みる
			}
		}

		// 通常のオブジェクトの場合
		const obj = value as Record<string, unknown>;

		// シンプルな値を持つオブジェクトの場合はその値を直接返す
		// 単一値を持つオブジェクトの検出（例: {value: "何か"} のようなパターン）
		const keys = Object.keys(obj);
		if (keys.length === 1 && keys[0] === 'value' && obj.value !== null && obj.value !== undefined) {
			return String(obj.value);
		}

		// オブジェクト自体が値である場合は、そのまま返す
		// 特定のプロパティ名に依存せず、直接その値を使用する
		if (typeof obj === 'object') {
			// 値がプリミティブ値かどうかをチェック
			if (obj !== null) {
				// 最初に文字列プロパティを探す
				for (const key in obj) {
					const val = obj[key];
					if (typeof val === 'string' && val.length > 0) {
						return val;
					}
				}

				// 次に数値プロパティを探す
				for (const key in obj) {
					const val = obj[key];
					if (typeof val === 'number') {
						return String(val);
					}
				}

				// 最後にどんな値でも取得
				for (const key in obj) {
					const val = obj[key];
					if (val !== null && val !== undefined) {
						return String(val);
					}
				}
			}
		}

		// それでもJSONに変換を試みる
		try {
			return JSON.stringify(value);
		} catch {
			// JSONに変換できない場合は標準の文字列化
			return String(value);
		}
	}

	return String(value);
}

/**
 * エンティティプロパティのエントリを取得する
 *
 * @param entity プロパティを取得するエンティティ
 * @returns プロパティ名と値のペア配列
 */
export function getPropertyEntries(entity: CesiumType.Entity): [string, unknown][] {
	if (!entity || !entity.properties) {
		return [];
	}

	// プロパティのエントリを取得
	const propertyEntries: [string, unknown][] = [];

	// 内部メソッドやメタデータとして扱うべきキー
	const metadataKeys = [
		'propertyNames',
		'getValue',
		'getPropertyNames',
		'getType',
		'getDefinitionChanged'
	];

	try {
		// entity.propertiesをPropertyBagWithIndexとして扱う
		const props = entity.properties as unknown as PropertyBagWithIndex;
		const processedProps = new Set<string>(); // すでに処理したプロパティを追跡

		// 1. propertyNamesが存在する場合、それを使用する
		if (Array.isArray(props.propertyNames)) {
			props.propertyNames.forEach((name: string) => {
				try {
					// Cesium PropertyBagの内部構造に基づく処理
					// '_propertyName'形式の内部プロパティからの取得を試みる
					const internalPropName = `_${name}`;
					if (
						internalPropName in props &&
						props[internalPropName] !== null &&
						typeof props[internalPropName] === 'object' &&
						'_value' in (props[internalPropName] as Record<string, unknown>)
					) {
						// '_propertyName._value'から値を取得
						const internalObj = props[internalPropName] as Record<string, unknown>;
						propertyEntries.push([name, internalObj._value]);
						processedProps.add(name);
					}
					// getValue メソッドがある場合はそれを使用
					else if (typeof props.getValue === 'function') {
						const value = props.getValue(name);
						propertyEntries.push([name, value]);
						processedProps.add(name);
					}
					// 直接アクセスもできる場合
					else if (name in props) {
						propertyEntries.push([name, props[name]]);
						processedProps.add(name);
					}
				} catch (e: unknown) {
					console.error(
						`プロパティ ${name} の取得に失敗:`,
						e instanceof Error ? e.message : String(e)
					);
				}
			});
		}

		// 2. 一般的なオブジェクトプロパティの検索（'_'で始まらないキー）
		Object.keys(props).forEach((key) => {
			// メタデータや内部プロパティ、すでに処理したプロパティは除外
			if (!key.startsWith('_') && !metadataKeys.includes(key) && !processedProps.has(key)) {
				propertyEntries.push([key, props[key]]);
				processedProps.add(key);
			}
		});

		// 3. '_propertyName'形式の内部プロパティからの追加取得
		// すでに処理されてないものがあれば追加で取得
		Object.keys(props).forEach((key) => {
			// '_'で始まる内部プロパティを処理
			if (
				key.startsWith('_') &&
				key !== '_propertyNames' &&
				!metadataKeys.includes(key.substring(1))
			) {
				const propName = key.substring(1);
				if (!processedProps.has(propName)) {
					// '_propertyName._value'から値を取得できる場合
					const internalObj = props[key] as Record<string, unknown> | null;
					if (internalObj && typeof internalObj === 'object' && '_value' in internalObj) {
						propertyEntries.push([propName, internalObj._value]);
						processedProps.add(propName);
					}
				}
			}
		});

		// プロパティの表示順序は取得した順序のまま（ソートしない）
		// properties または layerPropertyConfigs で明示的に指定した場合のみ、その順序で表示される
	} catch (error: unknown) {
		console.error(
			'プロパティの取得中にエラーが発生しました:',
			error instanceof Error ? error.message : String(error)
		);
	}

	return propertyEntries;
}
