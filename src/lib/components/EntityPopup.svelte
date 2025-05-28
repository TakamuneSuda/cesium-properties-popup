<script lang="ts">
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
	// options が変更されると、この $effect も再実行されるべきなので、
	// enableHover のような options から派生する値は $effect 内で読み込むか、
	// $derived を使うなどしてリアクティブにする必要があります。
	// この例では、$effect が options を暗黙的に依存関係として捉えることを期待します。
	// Svelte 5 では、$effect内で options.enableHover を直接読むことで options が依存関係になります。

	let selectedEntity: CesiumType.Entity | undefined = $state(undefined);
	let isPopupOpen = $state(false);
	// eventHandler を $state から通常の let 変数に変更
	let currentEventHandler: CesiumType.ScreenSpaceEventHandler | undefined = undefined;

	let displayMode: 'hover' | 'click' = 'hover';
	let isProcessingClick = false;

	$effect(() => {
		// options.enableHover を $effect 内で参照することで、options が変更された場合にも
		// この $effect が再実行されるようになります。
		const enableHoverEffect = options.enableHover ?? true;
		const clickCooldownEffect = options.clickCooldown ?? 1000;

		// 既存のイベントハンドラをクリーンアップする関数
		const cleanupEventHandler = () => {
			if (currentEventHandler) {
				currentEventHandler.destroy();
				currentEventHandler = undefined;
			}
		};

		if (viewer && cesium) {
			// まず既存のハンドラをクリーンアップ
			cleanupEventHandler();

			// 新しいイベントハンドラを作成
			currentEventHandler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

			currentEventHandler.setInputAction(
				(click: CesiumType.ScreenSpaceEventHandler.PositionedEvent) => {
					const pickedObject = viewer.scene.pick(click.position);

					if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
						isProcessingClick = true;
						selectedEntity = pickedObject.id;
						displayMode = 'click';
						isPopupOpen = true;

						setTimeout(() => {
							isProcessingClick = false;
						}, clickCooldownEffect); // optionsから派生した値を使用
					} else {
						displayMode = 'hover';
						closePopup();
					}
				},
				cesium.ScreenSpaceEventType.LEFT_CLICK
			);

			if (enableHoverEffect) {
				// optionsから派生した値を使用
				currentEventHandler.setInputAction(
					(movement: CesiumType.ScreenSpaceEventHandler.MotionEvent) => {
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
					},
					cesium.ScreenSpaceEventType.MOUSE_MOVE
				);
			}

			// この $effect のクリーンアップ関数
			return () => {
				cleanupEventHandler();
			};
		} else {
			// viewer または cesium が利用できない場合は、既存のハンドラをクリーンアップ
			cleanupEventHandler();
		}
	});

	function closePopup() {
		isPopupOpen = false;
		selectedEntity = undefined;
	}
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen} {options}>
		<PopupContent entity={selectedEntity} {cesium} {options} />
	</PopupPositioner>
{/if}
