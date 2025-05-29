import type * as CesiumType from 'cesium';
import { POPUP_SETTINGS } from './popupSettings';
import { entityPositionStrategies } from './entityPositionStrategies';

/**
 * 値がCesiumのPropertyオブジェクトかどうかを判定する型ガード
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
 * プロパティにインデックスシグネチャを持たせたPropertyBag型
 */
export interface PropertyBagWithIndex {
	[key: string]: unknown;
	propertyNames?: string[];
	getValue?: (propertyName: string) => unknown;
}

/**
 * 地物の3D座標を取得する関数
 * 戦略パターンを使用して、異なるタイプのエンティティに対応
 *
 * @param entity 座標を取得するエンティティ
 * @param cesium Cesiumライブラリの参照
 * @returns エンティティの3D座標、または取得できない場合はundefined
 */
export function getEntityPosition(
	entity: CesiumType.Entity,
	cesium: typeof CesiumType
): CesiumType.Cartesian3 | undefined {
	if (!entity || !cesium) return undefined;

	// 登録された戦略を順番に試す
	for (const strategy of entityPositionStrategies) {
		if (strategy.isApplicable(entity)) {
			const position = strategy.getPosition(entity, cesium);
			if (position) return position;
		}
	}

	return undefined;
}

/**
 * 画面上の座標を表すインターフェース
 */
interface ScreenPosition {
	x: number;
	y: number;
}

/**
 * 3D座標をスクリーン座標に変換する関数
 *
 * @param position 3D世界座標
 * @param viewer Cesiumビューア
 * @param cesium Cesiumライブラリの参照
 * @param fallbackPosition エラー時の代替位置
 * @returns スクリーン座標、または変換できない場合はundefined
 */

// 最後に計算された位置を保持する静的変数（スムージング用）
let lastCalculatedPosition: ScreenPosition | undefined = undefined;
// 設定値を読み込み
const SMOOTHING_FACTOR = POPUP_SETTINGS.positioning.smoothingFactor;
// 小さな動きを無視する閾値（ピクセル単位）- 1次フィルター
const MOVEMENT_THRESHOLD = POPUP_SETTINGS.positioning.thresholds.firstStage;
// 大きな変動と判定する閾値（ピクセル単位）- この値以上の変化は即座に反映
const LARGE_MOVEMENT_THRESHOLD = POPUP_SETTINGS.positioning.thresholds.largeMovement;

export function worldPositionToScreenPosition(
	position: CesiumType.Cartesian3,
	viewer: CesiumType.Viewer,
	cesium: typeof CesiumType,
	fallbackPosition?: ScreenPosition
): ScreenPosition | undefined {
	if (!viewer || !cesium || !position) return undefined;

	try {
		// 世界座標がビューポート内にあるか確認
		const inViewport =
			viewer.scene.camera.frustum
				.computeCullingVolume(
					viewer.scene.camera.position,
					viewer.scene.camera.direction,
					viewer.scene.camera.up
				)
				.computeVisibility(new cesium.BoundingSphere(position, 1.0)) !== cesium.Intersect.OUTSIDE;

		// ビューポート外の場合は以前の位置を維持
		if (!inViewport && fallbackPosition) {
			return fallbackPosition;
		}

		// -------- 3D世界座標からスクリーン座標に変換 --------
		// まずはstandard変換で試す
		const screenPosition = cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, position);

		if (!screenPosition) {
			// 標準的な方法が失敗した場合、代替計算を試みる
			console.warn('標準的な座標変換が失敗、代替計算を試みます');
			if (fallbackPosition) return fallbackPosition;
			return undefined;
		}

		// 計算された生の座標値（小数点以下を切り捨て）
		const rawX = Math.floor(screenPosition.x);
		const rawY = Math.floor(screenPosition.y);

		// ビュー外になっていないか確認（画面端のチェック）
		const canvas = viewer.scene.canvas;
		const isOffscreen =
			rawX < 0 || rawY < 0 || rawX > canvas.clientWidth || rawY > canvas.clientHeight;

		// 画面外の場合は前回位置を返す（ポップアップが急に消えるのを防ぐ）
		if (isOffscreen && fallbackPosition) {
			return fallbackPosition;
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
		console.error('座標変換エラー:', e instanceof Error ? e.message : String(e));

		// エラー発生時に回復を試みる（可能であれば最後の有効な位置を使用）
		if (fallbackPosition && fallbackPosition.x !== 0 && fallbackPosition.y !== 0) {
			return fallbackPosition;
		}
		return undefined;
	}
}

/**
 * プロパティの値を文字列形式で取得するヘルパー関数
 *
 * @param value 文字列化する値（CesiumのPropertyオブジェクトまたはその他の値）
 * @param cesium Cesiumライブラリの参照（オプション）
 * @returns 文字列化された値
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

		// プロパティの表示順序を調整する
		// 特定のキーを優先して表示する
		const sortedEntries: [string, unknown][] = [];

		// 優先したいプロパティのリスト（これらを順番に表示）
		const priorityKeys = [
			'name',
			'title',
			'description',
			'address',
			'coordinates',
			'area',
			'height',
			'established',
			'opened',
			'website',
			'platforms',
			'dailyPassengers',
			'id'
		];

		// 優先キーを先頭に配置
		priorityKeys.forEach((key) => {
			const entry = propertyEntries.find(([name]) => name === key);
			if (entry) {
				sortedEntries.push(entry);
			}
		});

		// 残りのプロパティをアルファベット順で追加
		const remainingEntries = propertyEntries
			.filter((entry) => !priorityKeys.includes(entry[0]))
			.sort((a, b) => a[0].localeCompare(b[0]));

		sortedEntries.push(...remainingEntries);

		// 並べ替えたエントリで元の配列を置き換え
		propertyEntries.length = 0;
		propertyEntries.push(...sortedEntries);
	} catch (error: unknown) {
		console.error(
			'プロパティの取得中にエラーが発生しました:',
			error instanceof Error ? error.message : String(error)
		);
	}

	return propertyEntries;
}
