/**
 * Cesium Properties Popup 型定義
 */
import type * as Cesium from 'cesium';

/**
 * EntityPopupコンポーネントのオプション
 */
export interface EntityPopupOptions {
	/** ホバーでポップアップを表示するかどうか (デフォルト: true) */
	enableHover?: boolean;

	/** クリック後のホバー制限時間（ミリ秒）(デフォルト: 1000) */
	clickCooldown?: number;

	/** プロパティをフィルタリングする関数 */
	filterProperties?: (name: string, value: unknown) => boolean;

	/** ポップアップのCSS設定 */
	styleOptions?: {
		/** ポップアップの幅（px） */
		width?: number;

		/** ポップアップの高さ（px） */
		height?: number;

		/** ポップアップのCSSクラス */
		popupClass?: string;

		/** ポップアップの背景色（CSS値） */
		backgroundColor?: string;

		/** ポップアップの縦方向のオーバーフロー（CSS値） */
		overflowY?: string;
	};
}

/**
 * 画面上の座標を表すインターフェース
 */
export interface ScreenPosition {
	x: number;
	y: number;
}

/**
 * インデックス付きプロパティバッグのインターフェース
 */
export interface PropertyBagWithIndex {
	[key: string]: unknown;
}

/**
 * ポップアップ位置計算のための設定インターフェース
 */
export interface PopupPositioningOptions {
	/** 画面のオフセット（ピクセル） */
	offset?: number;

	/** ポップアップの幅 */
	width?: number;

	/** ポップアップの高さ */
	height?: number;
}

/**
 * エンティティ位置取得戦略のインターフェース
 */
export interface EntityPositionStrategy {
	getPosition(entity: Cesium.Entity, scene: Cesium.Scene): Cesium.Cartesian3 | undefined;

	// オプショナルのメソッド
	updateTerrainHeight?: (entity: Cesium.Entity, scene: Cesium.Scene) => Promise<void>;
}

/**
 * PopupPositionerコンポーネントのProps
 */
export interface PopupPositionerProps {
	viewer: Cesium.Viewer | undefined;
	cesium: typeof Cesium | undefined;
	entity: Cesium.Entity | undefined;
	isPopupOpen: boolean;
	options?: EntityPopupOptions;
	children?: import('svelte').Snippet;
}

/**
 * EntityPopupコンポーネントのProps
 */
export interface EntityPopupProps {
	viewer: Cesium.Viewer;
	cesium: typeof Cesium;
	options?: EntityPopupOptions;
}

/**
 * PopupContentコンポーネントのProps
 */
export interface PopupContentProps {
	entity: Cesium.Entity | undefined;
	cesium: typeof Cesium | undefined;
	customRenderer?: import('svelte').Snippet;
}
