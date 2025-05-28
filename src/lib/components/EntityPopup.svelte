<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount, onDestroy } from 'svelte';
	import type * as CesiumType from 'cesium';
	import PopupPositioner from './PopupPositioner.svelte';
	import PopupContent from './PopupContent.svelte';
	import type { EntityPopupOptions } from '../types';

	interface Props {
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
		options?: EntityPopupOptions;
	}

	let { viewer, cesium, options = {} }: Props = $props();

	// オプションからデフォルト値を設定
	const enableHover = options.enableHover ?? true;
	const clickCooldown = options.clickCooldown ?? 1000;

	let selectedEntity: CesiumType.Entity | undefined = $state(undefined);
	let isPopupOpen = $state(false);
	let eventHandler: CesiumType.ScreenSpaceEventHandler | undefined = $state();

	// ポップアップの表示モード（hover: ホバー時のみ表示, click: クリック時に固定表示）
	let displayMode: 'hover' | 'click' = 'hover';

	// クリック処理中かどうかのフラグ
	let isProcessingClick = false;

	onMount(() => {
		setupEventHandler();
	});

	onDestroy(() => {
		removeEventHandler();
	});

	function setupEventHandler() {
		if (!viewer || !cesium) return;

		removeEventHandler();

		eventHandler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

		eventHandler.setInputAction((click: CesiumType.ScreenSpaceEventHandler.PositionedEvent) => {
			const pickedObject = viewer.scene.pick(click.position);

			if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
				isProcessingClick = true;
				selectedEntity = pickedObject.id;
				displayMode = 'click';
				isPopupOpen = true;

				setTimeout(() => {
					isProcessingClick = false;
				}, clickCooldown);
			} else {
				displayMode = 'hover';
				closePopup();
			}
		}, cesium.ScreenSpaceEventType.LEFT_CLICK);

		if (enableHover) {
			eventHandler.setInputAction((movement: CesiumType.ScreenSpaceEventHandler.MotionEvent) => {
				if (isProcessingClick || displayMode === 'click') {
					return;
				}

				const pickedObject = viewer.scene.pick(movement.endPosition);

				if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
					selectedEntity = pickedObject.id;
					isPopupOpen = true;
				} else if (!cesium.defined(pickedObject)) {
					closePopup();
				}
			}, cesium.ScreenSpaceEventType.MOUSE_MOVE);
		}
	}

	function removeEventHandler() {
		if (eventHandler) {
			eventHandler.destroy();
			eventHandler = undefined;
		}
	}

	function closePopup() {
		isPopupOpen = false;
		selectedEntity = undefined;
	}
	run(() => {
		if (viewer && cesium && !eventHandler) {
			setupEventHandler();
		}
	});
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen} {options}>
		<PopupContent entity={selectedEntity} {cesium} {options} />
	</PopupPositioner>
{/if}
