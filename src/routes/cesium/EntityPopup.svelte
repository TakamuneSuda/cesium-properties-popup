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

				// デバッグ：選択されたエンティティとそのプロパティを確認
				console.log('選択されたEntity:', selectedEntity);
				console.log('Entity properties:', selectedEntity?.properties);

				// プロパティが定義されている場合、その構造を調査
				if (selectedEntity?.properties) {
					console.log('Properties type:', typeof selectedEntity.properties);

					try {
						// プロパティの構造を調べる
						// entityHelpers.tsからインポートしたPropertyBagWithIndexを使用
						const props = selectedEntity.properties as unknown as PropertyBagWithIndex;
						console.log('Direct properties access:', props);

						// Entityに設定した実際のプロパティをログ
						if (selectedEntity.id === 'imperial-palace') {
							console.log('Imperial Palace properties:', {
								address: props.address,
								coordinates: props.coordinates,
								area: props.area,
								established: props.established,
								website: props.website
							});
						}
					} catch (err) {
						console.error('プロパティ調査中にエラーが発生:', err);
					}
				}

				// ポップアップの表示モードをクリックに設定
				displayMode = 'click';
				isPopupOpen = true;
				console.log('クリックイベント発生:', {
					entity: selectedEntity?.id,
					isPopupOpen,
					displayMode
				});

				// クリック処理のクールダウン期間を設定
				setTimeout(() => {
					isProcessingClick = false;
					console.log('クリッククールダウン終了');
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
					console.log('クリック処理中のためホバー処理をスキップ');
					return;
				}

				// クリックモードの場合は、何もホバーされていなくてもポップアップを閉じない
				if (displayMode === 'click') {
					console.log('クリックモード中なのでポップアップは閉じません');
					return;
				}

				const pickedObject = viewer.scene.pick(movement.endPosition);

				// エンティティがホバーされた場合（ホバーモードの時のみ処理）
				if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
					selectedEntity = pickedObject.id;

					// ポップアップを表示
					isPopupOpen = true;
					console.log('ホバーイベント発生:', {
						entity: selectedEntity?.id,
						position: movement.endPosition,
						isPopupOpen,
						displayMode
					});
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
		console.log('closePopup が呼び出されました', {
			calledBy: new Error().stack?.split('\n')[2] || '不明'
		});
		isPopupOpen = false;
		selectedEntity = undefined;
	}
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<PopupContent entity={selectedEntity} {cesium} />
	</PopupPositioner>
{/if}
