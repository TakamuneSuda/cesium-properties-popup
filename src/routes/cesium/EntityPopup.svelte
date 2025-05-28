<script lang="ts">
	import type * as CesiumType from 'cesium';
	import PopupPositioner from './components/PopupPositioner.svelte';
	import PopupContent from './components/PopupContent.svelte';

	interface Props {
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
		enableHover?: boolean;
	}

	let { viewer, cesium, enableHover = true }: Props = $props();

	let selectedEntity: CesiumType.Entity | undefined = $state(undefined);
	let isPopupOpen = $state(false);
	// eventHandler を $state から通常の let 変数に変更
	let currentEventHandler: CesiumType.ScreenSpaceEventHandler | undefined = undefined;

	let displayMode: 'hover' | 'click' = 'hover';
	let isProcessingClick = false;
	let clickCooldown = 1000; // ミリ秒

	$effect(() => {
		// この effect は viewer, cesium, enableHover に依存します。
		// Svelte がこれらの読み取りを検出し、変更時に effect を再実行します。

		// 既存のイベントハンドラをクリーンアップする内部関数
		const cleanupEventHandler = () => {
			if (currentEventHandler) {
				currentEventHandler.destroy();
				currentEventHandler = undefined;
			}
		};

		// effect が再実行される前に、まず既存のハンドラをクリーンアップ
		cleanupEventHandler();

		if (viewer && cesium) {
			currentEventHandler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

			// 左クリックイベントを監視
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
						}, clickCooldown);
					} else {
						displayMode = 'hover';
						closePopup();
					}
				},
				cesium.ScreenSpaceEventType.LEFT_CLICK
			);

			// ホバーイベントを追加（enableHover が true の場合のみ）
			if (enableHover) {
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

			// この effect インスタンスのクリーンアップ関数
			return cleanupEventHandler;
		} else {
			// viewer または cesium が利用できない場合、既存のハンドラは既にクリーンアップされているはず。
			// 何も設定されなかったので、空のクリーンアップ関数を返す。
			return () => {};
		}
	});

	function closePopup() {
		isPopupOpen = false;
		selectedEntity = undefined;
		// displayMode は LEFT_CLICK のelse節で 'hover' に戻されるため、
		// ここで明示的に displayMode を変更する必要は、現在のロジックではなさそう。
		// もし必要なら displayMode = 'hover'; を追加。
	}
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<PopupContent entity={selectedEntity} {cesium} />
	</PopupPositioner>
{/if}
