<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { throttle } from '../utils/throttle';
	import { calculatePopupPosition } from '../utils/popupPositioning';
	import { POPUP_SETTINGS } from '../utils/popupSettings';

	interface Props {
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
		entity: CesiumType.Entity | undefined;
		isPopupOpen: boolean;
		children?: import('svelte').Snippet;
	}

	let { viewer, cesium, entity, isPopupOpen, children }: Props = $props();

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
					updatePopupPosition('camera').catch((error) => {
						console.warn('PopupPositioner: カメラ変更時のポップアップ更新中にエラーが発生:', error);
					});
				}
			}, POPUP_SETTINGS.updateFrequency.cameraChangeThrottle);
			viewer.camera.changed.addEventListener(throttledCameraUpdate);
			cleanupCameraChangeListener = () =>
				viewer.camera.changed.removeEventListener(throttledCameraUpdate);

			// --- PreRender Listener ---
			const throttledRenderUpdate = throttle(() => {
				// スロットルされた関数が実行される時点で最新の props を確認
				if (isPopupOpen && entity && viewer && cesium) {
					updatePopupPosition('renderLoop').catch((error) => {
						console.warn(
							'PopupPositioner: レンダリングループでのポップアップ更新中にエラーが発生:',
							error
						);
					});
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
			// (元の onMount 内の初期位置計算もここでカバーされる)
			updatePopupPosition('reactive').catch((error) => {
				console.warn('PopupPositioner: リアクティブ更新中にエラーが発生:', error);
			});
		} else {
			// ポップアップが非表示、または entity/viewer/cesium が利用不可
			// `isPositionCalculated` をリセットしてポップアップ div を非表示にする
			if (isPositionCalculated) {
				// 実際に変更がある場合のみ state を更新
				isPositionCalculated = false;
			}
		}
	});

	// 地物の位置に基づいてポップアップ位置を更新
	async function updatePopupPosition(source: 'camera' | 'renderLoop' | 'reactive' = 'reactive') {
		// 必須の props が欠けている場合は処理を中断
		if (!entity || !viewer || !cesium) {
			if (isPositionCalculated) {
				isPositionCalculated = false; // コンテキストが失われたらポップアップを非表示
			}
			return;
		}

		// イベントソース追跡と重複更新防止
		const now = Date.now();
		const timeSinceLastUpdate = now - lastUpdateTime;

		if (
			source === 'renderLoop' &&
			lastUpdateSource === 'camera' &&
			timeSinceLastUpdate < POPUP_SETTINGS.updateFrequency.duplicatePreventionDelay
		) {
			return; // カメラ更新直後のレンダリング更新はスキップ
		}

		const newPosition = await calculatePopupPosition(entity, viewer, cesium, popupPosition);
		if (newPosition) {
			// 更新記録
			lastUpdateTime = now;
			lastUpdateSource = source;

			// 位置情報の更新
			popupPosition = newPosition;

			// 実際に値が取得できた場合にのみフラグを設定
			if (!isPositionCalculated) {
				// Svelte 5 の effect 内では直接代入で問題ないことが多い
				// タイミングの問題 (ちらつきなど) が発生した場合は、
				// `setTimeout(() => isPositionCalculated = true, 0)` に戻すことを検討
				isPositionCalculated = true; // 位置が計算されたことを記録
			}
		} else {
			// 新しい位置の計算に失敗した場合の処理 (例: エンティティが画面外)
			// isPositionCalculated を false にしてポップアップを隠すことを検討できます。
			// if (isPositionCalculated) isPositionCalculated = false;
		}
	}

	// LRUキャッシュは自動管理されるため、明示的なクリア処理は不要
</script>

{#if isPositionCalculated}
	<div
		class="z-[1000] -mt-2.5 max-h-[400px] max-w-[400px] min-w-[250px] -translate-x-1/2 -translate-y-full overflow-auto rounded border-l-3 border-blue-500 bg-white/95 antialiased opacity-90 shadow-lg will-change-transform"
		style="position: absolute; left: {popupPosition.x}px; top: {popupPosition.y}px; transition: transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out; transform: translate3d(0, 0, 0);"
		data-entity-id={entity?.id}
	>
		{@render children?.()}
	</div>
{/if}
