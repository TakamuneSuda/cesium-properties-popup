/**
 * Cesium Properties Popup Library
 * A component to display properties of Cesium entities on hover or click
 * 2025-05-29: Redefined after integration work
 */

// コアコンポーネントのエクスポート
export { default as EntityPopup } from './components/EntityPopup.svelte';
export { default as PopupPositioner } from './components/PopupPositioner.svelte';
export { default as PopupContent } from './components/PopupContent.svelte';

// 型定義のエクスポート
export * from './types';

// 設定のエクスポート
export { POPUP_SETTINGS as defaultSettings } from './utils/popupSettings';

// ユーティリティ関数のエクスポート
export {
	formatPropertyValue,
	getPropertyEntries,
	getEntityPosition,
	worldPositionToScreenPosition
} from './utils/entityHelpers';
export { calculatePopupPosition } from './utils/popupPositioning';
export { throttle } from './utils/throttle';
export {
	getDataSourceName,
	getApplicablePropertyConfig,
	matchesPattern
} from './utils/layerPropertyHelper';

// エンティティポジション戦略のエクスポート
export { entityPositionStrategies } from './utils/entityPositionStrategies';

// 再エクスポートを確実にするためのダミー変数
export const LIBRARY_VERSION = '1.0.0-integrated';
