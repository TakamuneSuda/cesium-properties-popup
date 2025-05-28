/**
 * Cesium Properties Popup ライブラリ
 * Cesiumのエンティティにホバーまたはクリックでプロパティを表示するコンポーネント
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
