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

	let selectedEntity: CesiumType.Entity | undefined = $state(undefined);
	let isPopupOpen = $state(false);
	// Changed eventHandler from $state to a regular let variable
	let currentEventHandler: CesiumType.ScreenSpaceEventHandler | undefined = undefined;

	let displayMode: 'hover' | 'click' = 'hover';
	let isProcessingClick = false;

	$effect(() => {
		// Get configuration values from options and set defaults
		const enableHoverEffect = options.enableHover ?? true;

		// Internal function to clean up existing event handlers
		const cleanupEventHandler = () => {
			if (currentEventHandler) {
				currentEventHandler.destroy();
				currentEventHandler = undefined;
			}
		};

		// Clean up existing handlers before the effect is re-executed
		cleanupEventHandler();

		if (viewer && cesium) {
			currentEventHandler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

			// Monitor left click events
			currentEventHandler.setInputAction(
				(click: CesiumType.ScreenSpaceEventHandler.PositionedEvent) => {
					const pickedObject = viewer.scene.pick(click.position);

					if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
						selectedEntity = pickedObject.id;
						displayMode = 'click';
						isPopupOpen = true;
					} else {
						displayMode = 'hover';
						closePopup();
					}
				},
				cesium.ScreenSpaceEventType.LEFT_CLICK
			);

			// Add hover events (only if enableHover is true)
			if (enableHoverEffect) {
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

			// Cleanup function for this effect instance
			return cleanupEventHandler;
		} else {
			// If viewer or cesium is not available, existing handlers should already be cleaned up.
			// Nothing was set up, so return an empty cleanup function.
			return () => {};
		}
	});

	function closePopup() {
		isPopupOpen = false;
		selectedEntity = undefined;
		// displayMode is reset to 'hover' in the LEFT_CLICK else clause,
		// so there's no need to explicitly change displayMode in the current logic.
	}
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen} {options}>
		<PopupContent entity={selectedEntity} {cesium} {options} />
	</PopupPositioner>
{/if}
