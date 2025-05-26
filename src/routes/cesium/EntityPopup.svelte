<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type * as CesiumType from 'cesium';
	import PopupPositioner from './components/PopupPositioner.svelte';
	import PopupContent from './components/PopupContent.svelte';
	import type { PropertyBagWithIndex } from './utils/entityHelpers';

	export let viewer: CesiumType.Viewer | undefined;
	export let cesium: typeof CesiumType | undefined;
	// ホバー機能の設定オプション
	export let enableHover = true; // ホバーでポップアップを表示するかどうか

	let selectedEntity: CesiumType.Entity | undefined = undefined;
	let isPopupOpen = false;
	let eventHandler: CesiumType.ScreenSpaceEventHandler | undefined;

	// ポップアップの表示モード（hover: ホバー時のみ表示, click: クリック時に固定表示）
	let displayMode: 'hover' | 'click' = 'hover';

	// クリック処理中かどうかのフラグと制御用変数
	let isProcessingClick = false; // クリック処理中かどうか
	let clickCooldown = 1000; // クリック後のホバー制限時間（ミリ秒）

	onMount(() => {
		setupEventHandler();
	});

	onDestroy(() => {
		removeEventHandler();
	});

	$: if (viewer && cesium && !eventHandler) {
		setupEventHandler();
	}

	function setupEventHandler() {
		if (!viewer || !cesium) return;

		// イベントハンドラーが既に存在する場合は破棄
		removeEventHandler();

		// 新しいイベントハンドラーを作成
		eventHandler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

		// 左クリックイベントを監視
		eventHandler.setInputAction((click: CesiumType.ScreenSpaceEventHandler.PositionedEvent) => {
			const pickedObject = viewer.scene.pick(click.position);

			// エンティティがクリックされた場合
			if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
				// クリック処理フラグをON
				isProcessingClick = true;

				selectedEntity = pickedObject.id;
				// ポップアップの表示モードをクリックに設定
				displayMode = 'click';
				isPopupOpen = true;

				// クリック処理のクールダウン期間を設定
				setTimeout(() => {
					isProcessingClick = false;
					// クリックモードは継続（displayModeはそのまま）
				}, clickCooldown);
			} else {
				// 何もクリックされなかった場合はポップアップを閉じる
				displayMode = 'hover'; // モードをホバーに戻す
				closePopup();
			}
		}, cesium.ScreenSpaceEventType.LEFT_CLICK);

		// ホバーイベントを追加（設定で有効な場合のみ）
		if (enableHover) {
			eventHandler.setInputAction((movement: CesiumType.ScreenSpaceEventHandler.MotionEvent) => {
				// クリック処理中はホバー処理をスキップ
				if (isProcessingClick) {
					return;
				}

				// クリックモードの場合は、何もホバーされていなくてもポップアップを閉じない
				if (displayMode === 'click') {
					return;
				}

				const pickedObject = viewer.scene.pick(movement.endPosition);

				// エンティティがホバーされた場合（ホバーモードの時のみ処理）
				if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
					selectedEntity = pickedObject.id;

					// ポップアップを表示
					isPopupOpen = true;
				} else if (!cesium.defined(pickedObject)) {
					// ホバーモードの時のみ、何もホバーされていない場合はポップアップを閉じる
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
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<PopupContent entity={selectedEntity} {cesium} />
	</PopupPositioner>
{/if}
