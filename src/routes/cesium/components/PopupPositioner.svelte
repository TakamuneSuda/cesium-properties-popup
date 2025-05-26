<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type * as CesiumType from 'cesium';
	import { throttle } from '../utils/throttle';
	import {
		calculatePopupPosition,
		clearTerrainHeightCacheIfNeeded
	} from '../utils/popupPositioning';

	export let viewer: CesiumType.Viewer | undefined;
	export let cesium: typeof CesiumType | undefined;
	export let entity: CesiumType.Entity | undefined;
	export let isPopupOpen: boolean;

	let popupPosition = { x: 0, y: 0 };
	let cameraChangedCallback: (() => void) | undefined;
	let preRenderEventRemovalCallback: (() => void) | undefined;
	// 位置が計算されたかどうかを追跡するフラグ
	let isPositionCalculated = false;

	// コンポーネントがマウントされたときにリスナーを設定
	onMount(() => {
		setupCameraChangeListener();
		setupRenderLoopUpdate();

		// コンポーネントがマウントされた後、初期位置の計算を行う
		if (entity && isPopupOpen) {
			updatePopupPosition().catch((error) => {
				console.warn('初期位置計算中にエラーが発生:', error);
			});
		}
	});

	// コンポーネントが破棄されるときにリスナーを削除
	onDestroy(() => {
		removeCameraChangeListener();
		removeRenderLoopUpdate();
	});

	// カメラの変更を監視してポップアップ位置を更新する関数
	function setupCameraChangeListener() {
		if (!viewer || !cesium) return;

		// 既存のリスナーを削除
		removeCameraChangeListener();

		// スロットリングを適用したリスナー（カメラ動作は特に高頻度になりやすい）
		// 100msで10FPSに制限（滑らかさはCSSトランジションで得るため頻度を下げる）
		const throttledUpdate = throttle(() => {
			if (isPopupOpen && entity) {
				updatePopupPosition().catch((error) => {
					console.warn('カメラ変更時のポップアップ更新中にエラーが発生:', error);
				});
			}
		}, 100); // 10FPSに制限（更新頻度を下げてCSSトランジションで滑らかさを確保）

		// 新しいリスナーを追加
		cameraChangedCallback = throttledUpdate;

		// カメラの変更イベントにリスナーを追加
		viewer.camera.changed.addEventListener(cameraChangedCallback);
	}

	function removeCameraChangeListener() {
		if (viewer && cesium && cameraChangedCallback) {
			viewer.camera.changed.removeEventListener(cameraChangedCallback);
			cameraChangedCallback = undefined;
		}
	}

	function setupRenderLoopUpdate() {
		if (!viewer || !cesium) return;

		// 既存のリスナーがあれば削除
		removeRenderLoopUpdate();

		// スロットリングを適用したアップデート
		// レンダリングループは頻度が高いため、より長い間隔でスロットリング
		const throttledUpdate = throttle(() => {
			if (isPopupOpen && entity) {
				updatePopupPosition().catch((error) => {
					console.warn('レンダリングループでのポップアップ更新中にエラーが発生:', error);
				});
			}
		}, 150); // 約6.7FPSに制限（低頻度の更新でCPU負荷を軽減）

		// プリレンダーイベントでポップアップ位置を更新
		preRenderEventRemovalCallback = viewer.scene.preRender.addEventListener(throttledUpdate);
	}

	function removeRenderLoopUpdate() {
		if (preRenderEventRemovalCallback) {
			preRenderEventRemovalCallback();
			preRenderEventRemovalCallback = undefined;
		}
	}

	// 地物の位置に基づいてポップアップ位置を更新
	async function updatePopupPosition() {
		if (!entity || !viewer || !cesium) return;

		const newPosition = await calculatePopupPosition(entity, viewer, cesium, popupPosition);
		if (newPosition) {
			// 位置情報の更新
			popupPosition = newPosition;

			// 実際に値が取得できた場合にのみフラグを設定
			// 副作用を持つ状態更新を分離して明示的に行う
			if (!isPositionCalculated) {
				setTimeout(() => {
					isPositionCalculated = true; // 位置が計算されたことを記録
				}, 0);
			}
		}
	}

	// リアクティブな更新 - エンティティまたはポップアップ表示状態の変更をトラッキング
	$: {
		// エンティティまたはポップアップ状態が変わったときだけ処理を行う
		// 現在の値を保持して変更検知用に使う
		const currentEntity = entity;
		const currentPopupState = isPopupOpen;

		if (currentPopupState && currentEntity) {
			// 即時に位置を計算（スロットリングをバイパス）
			Promise.resolve().then(() => {
				// 呼び出し時のエンティティと状態を使って条件チェック
				if (currentEntity === entity && currentPopupState === isPopupOpen) {
					// エンティティ変更検知用なので、ここでは直接フラグ操作しない
					updatePopupPosition().catch((error) => {
						console.warn('リアクティブ更新中にエラーが発生:', error);
					});
				}
			});
		}
	}

	// キャッシュサイズの管理
	$: if (isPopupOpen) {
		clearTerrainHeightCacheIfNeeded();
	}
</script>

{#if isPositionCalculated}
	<div
		class="z-[1000] -mt-2.5 max-h-[400px] max-w-[400px] min-w-[250px] -translate-x-1/2 -translate-y-full overflow-auto rounded border-l-3 border-blue-500 bg-white/95 antialiased opacity-90 shadow-lg will-change-transform"
		style="position: absolute; left: {popupPosition.x}px; top: {popupPosition.y}px; transition: transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out; transform: translate3d(0, 0, 0);"
		data-entity-id={entity?.id}
	>
		<slot />
	</div>
{/if}
