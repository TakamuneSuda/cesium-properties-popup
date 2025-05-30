<script lang="ts">
	import { throttle } from '../utils/throttle';
	import { calculatePopupPosition } from '../utils/popupPositioning';
	import { POPUP_SETTINGS } from '../utils/popupSettings';

	import type { PopupPositionerProps } from '../types';

	let {
		viewer,
		cesium,
		entity,
		isPopupOpen,
		children,
		options = {}
	}: PopupPositionerProps = $props();

	// Compute derived options with defaults
	let computedOptions = $derived({
		...options,
		styleOptions: {
			...POPUP_SETTINGS.defaultStyles,
			...(options?.styleOptions || {})
		}
	});

	let popupPosition = $state({ x: 0, y: 0 });
	let isPositionCalculated = $state(false);
	let lastUpdateSource = '';
	let lastUpdateTime = 0;
	let previousEntityId = $state<string | null>(null);

	// クリーンアップ関数の変数を定義
	let cleanupCameraChangeListener: (() => void) | undefined;
	let cleanupPreRenderListener: (() => void) | undefined;

	// エンティティとポップアップの状態変更を監視
	$effect(() => {
		// isPopupOpenが変更された時の処理
		if (!isPopupOpen) {
			isPositionCalculated = false;
			return;
		}

		// エンティティが変更された時の処理
		if (entity?.id !== previousEntityId) {
			isPositionCalculated = false;
			popupPosition = { x: 0, y: 0 };
			lastUpdateTime = 0;
			lastUpdateSource = '';
			previousEntityId = entity?.id ?? null;
		}

		// 必要な条件が揃っている場合のみ位置を更新
		if (isPopupOpen && entity && viewer && cesium) {
			updatePopupPosition('reactive').catch((error) =>
				console.warn('PopupPositioner: Position update error:', error)
			);
		}
	});

	// Effect 1: Manages Cesium event listeners
	$effect(() => {
		// When this effect re-executes (e.g., when viewer instance changes),
		// clean up any listeners that were set during the previous effect execution
		cleanupCameraChangeListener?.();
		cleanupCameraChangeListener = undefined;
		cleanupPreRenderListener?.();
		cleanupPreRenderListener = undefined;

		if (viewer && cesium) {
			// --- Camera Change Listener ---
			const throttledCameraUpdate = throttle(() => {
				// Check latest props at the time the throttled function executes
				if (isPopupOpen && entity && viewer && cesium) {
					updatePopupPosition('camera').catch((error) =>
						console.warn('PopupPositioner: Camera change update error:', error)
					);
				}
			}, POPUP_SETTINGS.updateFrequency.cameraChangeThrottle);
			viewer.camera.changed.addEventListener(throttledCameraUpdate);
			cleanupCameraChangeListener = () => {
				if (viewer) {
					viewer.camera.changed.removeEventListener(throttledCameraUpdate);
				}
			};

			// --- PreRender Listener ---
			const throttledRenderUpdate = throttle(() => {
				// Check latest props at the time the throttled function executes
				if (isPopupOpen && entity && viewer && cesium) {
					updatePopupPosition('renderLoop').catch((error) =>
						console.warn('PopupPositioner: Render loop update error:', error)
					);
				}
			}, POPUP_SETTINGS.updateFrequency.renderLoopThrottle);
			// viewer.scene.preRender.addEventListener returns a function for removal
			cleanupPreRenderListener = viewer.scene.preRender.addEventListener(throttledRenderUpdate);

			// Cleanup function for this effect instance
			return () => {
				cleanupCameraChangeListener?.();
				cleanupCameraChangeListener = undefined;
				cleanupPreRenderListener?.();
				cleanupPreRenderListener = undefined;
			};
		}
		// If viewer or cesium is undefined, listeners are not set up,
		// and any existing listeners from a previously valid state are handled
		// by the return function above or the explicit cleanup at the start of the effect block.
	});

	async function updatePopupPosition(source: 'camera' | 'renderLoop' | 'reactive' = 'reactive') {
		// Abort if required props are missing (double-checking even though effects also check)
		if (!entity || !viewer || !cesium) {
			if (isPositionCalculated) {
				isPositionCalculated = false; // Hide popup if context is lost
			}
			return;
		}

		// Optimization: Prevent duplicate updates from different sources in a short time
		const now = Date.now();
		if (
			source === 'renderLoop' &&
			lastUpdateSource === 'camera' &&
			now - lastUpdateTime < POPUP_SETTINGS.updateFrequency.duplicatePreventionDelay
		) {
			return;
		}

		// 現在位置を渡さずに新しい位置を計算
		const newPosition = await calculatePopupPosition(entity, viewer, cesium, { x: 0, y: 0 });

		if (newPosition) {
			lastUpdateTime = now;
			lastUpdateSource = source;
			popupPosition = newPosition;

			// 位置計算が完了したらポップアップを表示
			if (!isPositionCalculated) {
				isPositionCalculated = true;
			}
		} else {
			// Failed to calculate new position (e.g., entity is off-screen)
			// Hide the popup when entity goes off-screen
			if (isPositionCalculated) {
				isPositionCalculated = false; // Hide popup when entity is off-screen
			}
		}
	}
</script>

{#if isPositionCalculated}
	<div
		class="cesium-entity-popup {computedOptions.styleOptions?.popupClass || ''}"
		style="
			position: absolute; 
			left: {popupPosition.x}px; 
			top: {popupPosition.y}px; 
			transition: transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out; 
			{computedOptions.styleOptions?.height ? `height: ${computedOptions.styleOptions.height}px;` : ''}
			{computedOptions.styleOptions?.width ? `width: ${computedOptions.styleOptions.width}px;` : ''}
			{computedOptions.styleOptions?.backgroundColor
			? `background-color: ${computedOptions.styleOptions.backgroundColor};`
			: ''}
			{computedOptions.styleOptions?.overflowY
			? `overflow-y: ${computedOptions.styleOptions.overflowY};`
			: ''}"
		data-entity-id={entity?.id}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	/* Basic popup styles */
	.cesium-entity-popup {
		/* Display layer control */
		z-index: 1000;
		position: relative;

		/* Position adjustment - reference point shifted up from entity position */
		margin-top: -0.625rem;
		transform: translateX(-50%) translateY(-100%);

		/* Size limits */
		max-height: 400px;
		max-width: 400px;
		min-width: 200px;

		/* Scroll settings - handling overflow content */
		overflow: auto;

		/* Visual styles */
		border-radius: 0.375rem; /* More rounded corners */
		background-color: rgba(255, 255, 255, 0.95);
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		font-smooth: antialiased;
		opacity: 0.95; /* Higher opacity for better readability */

		/* Animation and performance optimization */
		will-change: transform;
	}
</style>
