<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { throttle } from '../utils/throttle';
	import { calculatePopupPosition } from '../utils/popupPositioning';
	import { POPUP_SETTINGS } from '../utils/popupSettings';
	import type { EntityPopupOptions, PopupPositionerProps } from '../types';

	// Props と デフォルト設定のマージ
	let props = $props<PopupPositionerProps>();
	let { viewer, cesium, entity, isPopupOpen, children } = props;
	let options = {
		...props.options,
		styleOptions: {
			...POPUP_SETTINGS.defaultStyles, // デフォルトスタイル
			...(props.options?.styleOptions || {}) // ユーザー設定で上書き
		}
	};

	let popupPosition = $state({ x: 0, y: 0 });
	let isPositionCalculated = $state(false);

	// Effect 1 で管理するリスナーのクリーンアップ関数を保持
	let cleanupCameraChangeListener: (() => void) | undefined = undefined;
	let cleanupPreRenderListener: (() => void) | undefined = undefined;

	// イベント処理の最適化のための内部状態 (通常の let 変数)
	let lastUpdateSource = '';
	let lastUpdateTime = 0;

	// Effect 1: Cesium のイベントリスナー (camera.changed, scene.preRender) を管理
	// `viewer` または `cesium` プロパティの変更に反応してリスナーを設定・解除
	$effect(() => {
		// この effect が再実行される際 (例: viewer インスタンスの変更) に、
		// 前回の effect 実行時に設定されたリスナーが残っていればクリーンアップする
		cleanupCameraChangeListener?.();
		cleanupCameraChangeListener = undefined;
		cleanupPreRenderListener?.();
		cleanupPreRenderListener = undefined;

		if (viewer && cesium) {
			// --- Camera Change Listener ---
			const throttledCameraUpdate = throttle(() => {
				// スロットルされた関数が実行される時点で最新の props を確認
				if (isPopupOpen && entity && viewer && cesium) {
					updatePopupPosition('camera').catch((error) =>
						console.warn('PopupPositioner: Camera change update error:', error)
					);
				}
			}, POPUP_SETTINGS.updateFrequency.cameraChangeThrottle);
			viewer.camera.changed.addEventListener(throttledCameraUpdate);
			cleanupCameraChangeListener = () =>
				viewer.camera.changed.removeEventListener(throttledCameraUpdate);

			// --- PreRender Listener ---
			const throttledRenderUpdate = throttle(() => {
				// スロットルされた関数が実行される時点で最新の props を確認
				if (isPopupOpen && entity && viewer && cesium) {
					updatePopupPosition('renderLoop').catch((error) =>
						console.warn('PopupPositioner: Render loop update error:', error)
					);
				}
			}, POPUP_SETTINGS.updateFrequency.renderLoopThrottle);
			// viewer.scene.preRender.addEventListener は解除用の関数を返す
			cleanupPreRenderListener = viewer.scene.preRender.addEventListener(throttledRenderUpdate);

			// この effect インスタンスのクリーンアップ関数
			return () => {
				cleanupCameraChangeListener?.();
				cleanupCameraChangeListener = undefined;
				cleanupPreRenderListener?.();
				cleanupPreRenderListener = undefined;
			};
		}
		// viewer や cesium が未定義の場合、リスナーは設定されず、
		// 以前の有効な状態からの既存のリスナーは、上記の return 関数または
		// effect ブロックの開始時の明示的なクリーンアップによって処理される。
	});

	// Effect 2: `isPopupOpen`、`entity` の変更に反応し、ポップアップの表示/非表示と位置を更新
	// マウント時やプロパティ更新時に条件が満たされれば、初期の位置計算も処理
	$effect(() => {
		if (isPopupOpen && entity && viewer && cesium) {
			// ポップアップを表示し、位置を計算する条件が満たされている
			updatePopupPosition('reactive').catch((error) =>
				console.warn('PopupPositioner: Reactive update error:', error)
			);
		} else {
			// ポップアップが非表示、または entity/viewer/cesium が利用不可
			// `isPositionCalculated` をリセットしてポップアップ div を非表示にする
			if (isPositionCalculated) {
				// 実際に変更がある場合のみ state を更新
				isPositionCalculated = false;
			}
		}
	});

	async function updatePopupPosition(source: 'camera' | 'renderLoop' | 'reactive' = 'reactive') {
		// 必須の props が欠けている場合は処理を中断 (effect でもチェックしているが念のため)
		if (!entity || !viewer || !cesium) {
			if (isPositionCalculated) {
				isPositionCalculated = false; // コンテキストが失われたらポップアップを非表示
			}
			return;
		}

		// 最適化: 短時間での異なるソースからの重複更新を防止
		const now = Date.now();
		if (
			source === 'renderLoop' &&
			lastUpdateSource === 'camera' &&
			now - lastUpdateTime < POPUP_SETTINGS.updateFrequency.duplicatePreventionDelay
		) {
			return;
		}

		const newPosition = await calculatePopupPosition(entity, viewer, cesium, popupPosition);

		if (newPosition) {
			lastUpdateTime = now;
			lastUpdateSource = source;
			popupPosition = newPosition; // $state を更新: ポップアップのスクリーン座標

			if (!isPositionCalculated) {
				// 位置が正常に計算されたので、レンダリングのためにフラグを立てる
				// Svelte 5 の effect 内では直接代入で問題ないことが多い
				// タイミングの問題 (ちらつきなど) が発生した場合は、
				// `setTimeout(() => isPositionCalculated = true, 0)` に戻すことを検討
				isPositionCalculated = true;
			}
		} else {
			// 新しい位置の計算に失敗 (例: エンティティが画面外)
			// ポップアップが表示されていた場合、非表示にする必要があるかもしれない
			// 現在のロジックでは、calculatePopupPosition が null を返しても isPositionCalculated は false に設定されない
			// Effect 2 が isPopupOpen/entity の変更で非表示にするが、計算失敗自体では処理しない
			// if (isPositionCalculated) isPositionCalculated = false; // 必要であればこの行を追加検討
		}
	}
</script>

{#if isPositionCalculated}
	<div
		class="cesium-entity-popup {options.styleOptions?.popupClass || ''}"
		style="
			position: absolute; 
			left: {popupPosition.x}px; 
			top: {popupPosition.y}px; 
			transition: transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out; 
			{options.styleOptions?.height ? `height: ${options.styleOptions.height}px;` : ''}
			{options.styleOptions?.width ? `width: ${options.styleOptions.width}px;` : ''}
			{options.styleOptions?.backgroundColor
			? `background-color: ${options.styleOptions.backgroundColor};`
			: ''}
			{options.styleOptions?.overflowY ? `overflow-y: ${options.styleOptions.overflowY};` : ''}"
		data-entity-id={entity?.id}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	/* ポップアップの基本スタイル */
	.cesium-entity-popup {
		/* 表示レイヤー制御 */
		z-index: 1000;
		position: relative;

		/* 位置調整 - エンティティの位置から上にシフトした基準点 */
		margin-top: -0.625rem;
		transform: translateX(-50%) translateY(-100%);

		/* サイズ制限 */
		max-height: 400px;
		max-width: 400px;
		min-width: 250px;

		/* スクロール設定 - コンテンツがあふれた場合の対応 */
		overflow: auto;

		/* 視覚的スタイル */
		border-radius: 0.375rem; /* より丸みのある角 */
		border-left: 3px solid #3b82f6; /* アクセントの青いボーダー */
		background-color: rgba(255, 255, 255, 0.95);
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		font-smooth: antialiased;
		opacity: 0.95; /* より高い不透明度で読みやすく */

		/* シャドウ効果 - よりシャープで現代的 */
		box-shadow:
			0 10px 20px -5px rgba(0, 0, 0, 0.15),
			0 4px 8px -2px rgba(0, 0, 0, 0.1),
			0 0 0 1px rgba(0, 0, 0, 0.05);

		/* アニメーションとパフォーマンス最適化 */
		will-change: transform;
	}
</style>
