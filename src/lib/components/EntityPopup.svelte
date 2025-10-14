<script lang="ts">
	import type * as CesiumType from 'cesium';
	import PopupPositioner from './PopupPositioner.svelte';
	import PopupContent from './PopupContent.svelte';
	import type { EntityPopupProps, DataSourcePattern, EntityEventContext } from '../types';

	let { viewer, cesium, options = {} }: EntityPopupProps = $props();

	let selectedEntity: CesiumType.Entity | undefined = $state(undefined);
	let isPopupOpen = $state(false);
	// Changed eventHandler from $state to a regular let variable
	let currentEventHandler: CesiumType.ScreenSpaceEventHandler | undefined = undefined;

	let displayMode: 'hover' | 'click' = 'hover';
	let isProcessingClick = false;

	/**
	 * DataSource名がパターンリストのいずれかにマッチするか判定
	 * @param name - DataSource名
	 * @param patterns - パターンリスト（文字列 or 正規表現）
	 * @returns マッチした場合true
	 */
	function matchesAnyPattern(name: string, patterns: DataSourcePattern[]): boolean {
		return patterns.some((pattern) => {
			if (typeof pattern === 'string') {
				// 文字列の場合は完全一致
				return name === pattern;
			} else if (pattern instanceof RegExp) {
				// RegExpの場合は正規表現マッチング
				return pattern.test(name);
			}
			return false;
		});
	}

	/**
	 * コールバックを安全に実行する
	 * @param callback - 実行するコールバック関数
	 * @param entity - イベントが発生したエンティティ
	 * @param position - マウス位置
	 * @param eventType - イベントタイプ
	 */
	async function executeCallback(
		callback: ((context: EntityEventContext) => void | Promise<void>) | undefined,
		entity: CesiumType.Entity,
		position: { x: number; y: number },
		eventType: 'click' | 'hover'
	): Promise<void> {
		if (!callback) {
			return;
		}

		try {
			// DataSource名を取得
			let dataSourceName: string | undefined;
			if (entity.entityCollection && entity.entityCollection.owner) {
				const owner = entity.entityCollection.owner;
				if ('name' in owner) {
					dataSourceName = (owner as CesiumType.DataSource).name;
				}
			}

			// コンテキストを構築
			const context: EntityEventContext = {
				entity,
				position,
				eventType,
				dataSourceName
			};

			// コールバックを実行
			await callback(context);
		} catch (error) {
			console.error(`Error in ${eventType} callback:`, error);
		}
	}

	/**
	 * エンティティのポップアップ表示可否を判定（DataSource単位）
	 * @param entity - 判定対象のEntity
	 * @returns 表示可能な場合true
	 */
	function shouldShowPopupForEntity(entity: CesiumType.Entity): boolean {
		if (!entity) return false;

		// DataSourceによるホワイトリストチェック
		if (options.includeDataSources && entity.entityCollection && entity.entityCollection.owner) {
			const owner = entity.entityCollection.owner;
			// DataSourceの場合のみnameプロパティを確認
			if ('name' in owner) {
				const dataSourceName = (owner as CesiumType.DataSource).name;
				if (dataSourceName && !matchesAnyPattern(dataSourceName, options.includeDataSources)) {
					return false;
				}
			}
		}

		// DataSourceによる除外チェック
		if (options.excludeDataSources && entity.entityCollection && entity.entityCollection.owner) {
			const owner = entity.entityCollection.owner;
			// DataSourceの場合のみnameプロパティを確認
			if ('name' in owner) {
				const dataSourceName = (owner as CesiumType.DataSource).name;
				if (dataSourceName && matchesAnyPattern(dataSourceName, options.excludeDataSources)) {
					return false;
				}
			}
		}

		return true;
	}

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
				async (click: CesiumType.ScreenSpaceEventHandler.PositionedEvent) => {
					const pickedObject = viewer.scene.pick(click.position);

					if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
						const entity = pickedObject.id;

						// ポップアップ表示可否をチェック
						if (shouldShowPopupForEntity(entity)) {
							// クリックコールバックを実行
							await executeCallback(options.onEntityClick, entity, click.position, 'click');

							// showPopup オプション（デフォルト: true）に従ってポップアップを表示
							const shouldShowPopup = options.showPopup ?? true;
							if (shouldShowPopup) {
								selectedEntity = entity;
								displayMode = 'click';
								isPopupOpen = true;
							}
						}
					} else {
						// 空白クリック
						displayMode = 'hover';
						closePopup();

						// 空白クリックコールバックを実行
						if (options.onEmptyClick) {
							try {
								await options.onEmptyClick({
									x: click.position.x,
									y: click.position.y
								});
							} catch (error) {
								console.error('Error in onEmptyClick callback:', error);
							}
						}
					}
				},
				cesium.ScreenSpaceEventType.LEFT_CLICK
			);

			// Add hover events (only if enableHover is true)
			if (enableHoverEffect) {
				currentEventHandler.setInputAction(
					async (movement: CesiumType.ScreenSpaceEventHandler.MotionEvent) => {
						if (isProcessingClick || displayMode === 'click') {
							return;
						}

						const pickedObject = viewer.scene.pick(movement.endPosition);

						if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
							// ポップアップ表示可否をチェック
							if (shouldShowPopupForEntity(pickedObject.id)) {
								// ホバーコールバックを実行
								await executeCallback(
									options.onEntityHover,
									pickedObject.id,
									movement.endPosition,
									'hover'
								);

								// showPopup オプション（デフォルト: true）に従ってポップアップを表示
								const shouldShowPopup = options.showPopup ?? true;
								if (shouldShowPopup) {
									selectedEntity = pickedObject.id;
									isPopupOpen = true;
								}
							}
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
