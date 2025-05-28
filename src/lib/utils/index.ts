import type * as CesiumType from 'cesium';

/**
 * EntityPopupコンポーネントの設定オプション
 */
export interface EntityPopupOptions {
	/** ホバーでポップアップを表示するかどうか */
	enableHover?: boolean;
	/** クリック後のホバー制限時間（ミリ秒） */
	clickCooldown?: number;
	/** プロパティをフィルタリングする関数 */
	filterProperties?: (name: string, value: unknown) => boolean;
	/** プロパティの表示形式をカスタマイズする関数 */
	formatProperty?: (name: string, value: unknown, cesium?: typeof CesiumType) => string;
	/** ポップアップのCSS設定 */
	styleOptions?: {
		/** ポップアップの最大幅（px） */
		maxWidth?: number;
		/** ポップアップの最大高さ（px） */
		maxHeight?: number;
		/** ポップアップのCSSクラス */
		popupClass?: string;
	};
}
