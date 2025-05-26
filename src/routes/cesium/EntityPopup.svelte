<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type * as CesiumType from 'cesium';

    export let viewer: CesiumType.Viewer | undefined;
    export let cesium: typeof CesiumType | undefined;
    // ホバー機能の設定オプション
    export let enableHover = true; // ホバーでポップアップを表示するかどうか
    
    let selectedEntity: CesiumType.Entity | undefined = undefined;
    let isPopupOpen = false;
    let popupPosition = { x: 0, y: 0 };
    let eventHandler: CesiumType.ScreenSpaceEventHandler | undefined;
    
    // 地形高さのキャッシュを保持するマップ
    let terrainHeightCache: Map<string, number> = new Map();
    
    // ポップアップの表示モード（hover: ホバー時のみ表示, click: クリック時に固定表示）
    let displayMode: 'hover' | 'click' = 'hover';
    
    // クリック処理中かどうかのフラグと制御用変数
    let isProcessingClick = false; // クリック処理中かどうか
    let clickCooldown = 1000; // クリック後のホバー制限時間（ミリ秒、1秒に延長）

    // カメラ変更リスナー
    let cameraChangedCallback: (() => void) | undefined;
    
    // レンダリングループを活用した更新用変数
    let preRenderEventRemovalCallback: Function | undefined;

    // スロットリング用ヘルパー関数 - パフォーマンス最適化版
    function throttle(callback: Function, delay: number) {
        let lastCall = 0;
        let timeoutId: number | undefined;
        let lastArgs: any[] | undefined;
        let requestFrameId: number | undefined;
        
        return function(...args: any[]) {
            lastArgs = args; // 常に最新の引数を保持
            const now = Date.now();
            const timeSinceLastCall = now - lastCall;
            
            // 前回の呼び出しから十分な時間が経過している場合
            if (timeSinceLastCall >= delay) {
                // キャンセル可能なリクエストがあれば解除
                if (requestFrameId) {
                    cancelAnimationFrame(requestFrameId);
                    requestFrameId = undefined;
                }
                
                lastCall = now;
                
                // 実行はrequestAnimationFrameを利用して、ブラウザの描画タイミングに合わせる
                requestFrameId = requestAnimationFrame(() => {
                    callback(...args);
                    requestFrameId = undefined;
                });
            } else {
                // 前回の呼び出しから指定時間経過していない場合、タイマーをリセット
                clearTimeout(timeoutId);
                
                // 遅延タイマーをセット
                timeoutId = setTimeout(() => {
                    lastCall = Date.now();
                    
                    // 最後の実行もrequestAnimationFrameを使用
                    requestFrameId = requestAnimationFrame(() => {
                        callback(...lastArgs!);
                        requestFrameId = undefined;
                    });
                }, delay - timeSinceLastCall) as unknown as number;
            }
        };
    }

    // 地物の3D座標を取得する関数
    function getEntityPosition(entity: CesiumType.Entity): CesiumType.Cartesian3 | undefined {
        if (!entity || !cesium) return undefined;
        
        // 位置情報が直接ある場合
        if (entity.position) {
            const julianDate = cesium.JulianDate.now();
            return entity.position.getValue(julianDate);
        }
        
        // ポリゴンの場合は中心点を使用
        if (entity.polygon && entity.polygon.hierarchy) {
            try {
                const julianDate = cesium.JulianDate.now();
                const hierarchy = entity.polygon.hierarchy.getValue(julianDate);
                if (hierarchy && hierarchy.positions) {
                    // ポリゴンの中心点を計算
                    return cesium.BoundingSphere.fromPoints(hierarchy.positions).center;
                }
            } catch (e) {
                console.error('ポリゴン中心点計算エラー:', e);
            }
        }
        
        // その他の形状の場合
        if (entity.billboard) {
            try {
                const julianDate = cesium.JulianDate.now();
                // BillboardGraphics自体にはpositionはないので、entity.positionを使う
                return (entity.position as CesiumType.Property | undefined)?.getValue(julianDate);
            } catch (e) {
                console.error('ビルボード位置取得エラー:', e);
            }
        }
        
        return undefined;
    }

    // 3D座標をスクリーン座標に変換する関数
    function worldPositionToScreenPosition(position: CesiumType.Cartesian3): { x: number, y: number } | undefined {
        if (!viewer || !cesium || !position) return undefined;
        
        try {
            // 3D世界座標からスクリーン座標に変換
            // worldToWindowCoordinatesはViewportとSceneCoordinatesの両方を考慮
            const screenPosition = cesium.SceneTransforms.worldToWindowCoordinates(
                viewer.scene,
                position
            );
            
            if (!screenPosition) return undefined;
            
            // 一貫したスクリーン位置のために値を整数にする
            // 小数点以下のわずかな変動がUIのちらつきを引き起こす可能性があるため
            return {
                x: Math.round(screenPosition.x),
                y: Math.round(screenPosition.y)
            };
        } catch (e) {
            console.error('座標変換エラー:', e);
            
            // エラー発生時に回復を試みる（可能であれば最後の有効な位置を使用）
            if (popupPosition.x !== 0 && popupPosition.y !== 0) {
                return popupPosition;
            }
            return undefined;
        }
    }

    onMount(() => {
        setupEventHandler();
        setupCameraChangeListener();
        setupRenderLoopUpdate();
    });

    onDestroy(() => {
        removeEventHandler();
        removeCameraChangeListener();
        removeRenderLoopUpdate();
    });

    $: if (viewer && cesium && !eventHandler) {
        setupEventHandler();
        setupCameraChangeListener();
        setupRenderLoopUpdate();
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
                        const props = selectedEntity.properties as any;
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
                
                // ポップアップの位置を地物の位置に基づいて設定（非同期）
                updatePopupPosition().then(() => {
                    // ポップアップの表示モードをクリックに設定
                    displayMode = 'click';
                    isPopupOpen = true;
                    console.log('クリックイベント発生:', {
                        entity: selectedEntity?.id,
                        position: popupPosition,
                        isPopupOpen,
                        displayMode
                    });
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
                    
                    // ポップアップの位置を地物の位置に基づいて設定（非同期）
                    updatePopupPosition().then(() => {
                        // ポップアップを表示
                        isPopupOpen = true;
                        console.log('ホバーイベント発生:', {
                            entity: selectedEntity?.id,
                            position: movement.endPosition,
                            isPopupOpen,
                            displayMode
                        });
                    });
                } else if (!cesium.defined(pickedObject)) {
                    // ホバーモードの時のみ、何もホバーされていない場合はポップアップを閉じる
                    closePopup();
                }
            }, cesium.ScreenSpaceEventType.MOUSE_MOVE);
        }
    }

    // カメラの変更を監視してポップアップ位置を更新する関数
    function setupCameraChangeListener() {
        if (!viewer || !cesium) return;
        
        // 既存のリスナーを削除
        removeCameraChangeListener();
        
        // スロットリングを適用したリスナー（カメラ動作は特に高頻度になりやすい）
        // 24FPS (約42ms) が良いバランス - 滑らかさとパフォーマンスを両立
        const throttledUpdate = throttle(() => {
            if (isPopupOpen && selectedEntity) {
                updatePopupPosition().catch(error => {
                    console.warn('カメラ変更時のポップアップ更新中にエラーが発生:', error);
                });
            }
        }, 42); // 約24FPSに制限
        
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
        
        // レンダリングループは既にブラウザのフレームレートに最適化されているため、
        // やや低めのスロットリング値を設定して安定性を確保
        const throttledUpdate = throttle(() => {
            if (isPopupOpen && selectedEntity) {
                // リアルタイムでの位置更新はポップアップの安定性に重要（非同期）
                updatePopupPosition().catch(error => {
                    console.warn('レンダリングループでのポップアップ更新中にエラーが発生:', error);
                });
            }
        }, 80); // 約12FPS - ポップアップの動きとしては十分滑らか
        
        // プリレンダーイベントでポップアップ位置を更新
        // preRenderはレンダリング直前に呼ばれるため、最新の位置を反映できる
        preRenderEventRemovalCallback = viewer.scene.preRender.addEventListener(throttledUpdate);
    }

    function removeRenderLoopUpdate() {
        if (preRenderEventRemovalCallback) {
            preRenderEventRemovalCallback();
            preRenderEventRemovalCallback = undefined;
        }
    }

    // 地物の位置に基づいてポップアップ位置を更新する関数
    async function updatePopupPosition() {
        if (!selectedEntity || !viewer || !cesium) return;
        
        try {
            // 地物の3D座標を取得
            const entityPosition = getEntityPosition(selectedEntity);
            if (!entityPosition) return;

            // Cartographic座標に変換（地形サンプリングのために必要）
            const cartographic = cesium.Cartographic.fromCartesian(entityPosition);
            if (!cartographic) return;
            
            // 地形の高さを考慮した位置計算
            let terrainHeight = 0;
            
            // キャッシュキーを作成 (エンティティID)
            const entityId = String(selectedEntity.id);
            
            if (viewer.terrainProvider) {
                // キャッシュにあるか確認
                if (terrainHeightCache.has(entityId)) {
                    // キャッシュから取得
                    terrainHeight = terrainHeightCache.get(entityId)!;
                    console.log('キャッシュから地形高さを取得:', terrainHeight, 'エンティティID:', entityId);
                } else {
                    try {
                        // 地形の高さを取得するためのサンプリング
                        const terrainSamplePositions = [cartographic];
                        const updatedPositions = await cesium.sampleTerrainMostDetailed(
                            viewer.terrainProvider, 
                            terrainSamplePositions
                        );
                        
                        // 地形高さを取得
                        terrainHeight = updatedPositions[0].height || 0;
                        console.log('取得した地形高さ:', terrainHeight, 'エンティティID:', entityId);
                        
                        // キャッシュに保存
                        terrainHeightCache.set(entityId, terrainHeight);
                    } catch (error) {
                        console.warn('地形サンプリング中にエラーが発生:', error);
                    }
                }
                
                // 元の位置より地形高さの方が高い場合は地形高さを使用
                cartographic.height = Math.max(cartographic.height, terrainHeight);
            }
            
            // 更新されたCartographicをCartesianに戻す
            const positionWithTerrain = cesium.Cartographic.toCartesian(cartographic);
            
            // カメラからの距離に応じてオフセットを動的に調整
            const cameraDistance = cesium.Cartesian3.distance(
                viewer.camera.position, 
                positionWithTerrain
            );
            
            // 距離に応じたスケール係数
            // より適切なスケーリング - 近すぎず、遠すぎない適切なオフセット
            const offsetScale = Math.max(cameraDistance * 0.04, 10); // 最小10m、距離の4%
            
            // オフセット位置を計算（地物の上方に表示）
            const offsetPosition = cesium.Cartesian3.add(
                positionWithTerrain,
                new cesium.Cartesian3(0, 0, offsetScale), // 動的なZ方向オフセット
                new cesium.Cartesian3()
            );
            
            // より正確な座標変換のためのメソッド選択
            // worldToWindowCoordinatesはシーン内の位置を画面座標に変換
            const screenPosition = worldPositionToScreenPosition(offsetPosition);
            if (!screenPosition) return;
            
            // ポップアップ位置を更新 - スムーズな更新のための最適化
            const x = Math.round(screenPosition.x);
            const y = Math.round(screenPosition.y);
            
            // 座標が大きく変化した場合のみ更新（微小な変化による描画更新を減らす）
            if (Math.abs(popupPosition.x - x) > 1 || Math.abs(popupPosition.y - y) > 1) {
                popupPosition = { x, y };
            }
        } catch (error) {
            console.error('ポップアップ位置更新中にエラーが発生しました:', error);
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
        // キャッシュはエンティティごとに取得したものなので、closePopupでクリアしない
        // 次回同じエンティティを選択したとき再利用できる
    }

    // プロパティの値を文字列形式で取得するヘルパー関数
    function formatPropertyValue(value: any): string {
        if (value === undefined || value === null) return '';
        
        // Cesium Propertyオブジェクトの場合
        if (typeof value === 'object') {
            // Cesium Property オブジェクトの場合
            if (value.getValue) {
                try {
                    const julianDate = cesium?.JulianDate.now();
                    if (julianDate) {
                        const resolvedValue = value.getValue(julianDate);
                        return resolvedValue !== undefined ? String(resolvedValue) : '';
                    }
                } catch (e) {
                    // エラー時は標準の文字列変換を試みる
                }
            }
            
            // 通常のオブジェクトの場合
            // 特定のプロパティの場合は、直接その値を返す
            if (value.address && typeof value.address === 'string') {
                return value.address;
            } else if (value.coordinates && typeof value.coordinates === 'string') {
                return value.coordinates;
            } else if (value.area && typeof value.area === 'string') {
                return value.area;
            } else if (value.established || value.opened) {
                return String(value.established || value.opened);
            } else if (value.website && typeof value.website === 'string') {
                return value.website;
            } else if (value.height && typeof value.height === 'string') {
                return value.height;
            } else if (value.platforms && typeof value.platforms === 'string') {
                return value.platforms;
            } else if (value.dailyPassengers && typeof value.dailyPassengers === 'string') {
                return value.dailyPassengers;
            }
            
            // それでもJSONに変換を試みる
            try {
                return JSON.stringify(value);
            } catch (e) {
                // JSONに変換できない場合は標準の文字列化
                return String(value);
            }
        }
        
        return String(value);
    }

    // ポップアップの状態変化を監視して位置を更新
    $: if (isPopupOpen && selectedEntity) {
        // 非同期更新
        updatePopupPosition().catch(error => {
            console.warn('リアクティブ更新中にエラーが発生:', error);
        });
    }
    
    // キャッシュサイズの管理
    $: if (terrainHeightCache.size > 20) { // 20個以上のキャッシュがたまったらクリア
        console.log('キャッシュサイズがしきい値を超えました。キャッシュをクリア:', terrainHeightCache.size);
        terrainHeightCache = new Map();
    }

    function getPropertyEntries(): [string, any][] {
        if (!selectedEntity || !selectedEntity.properties) {
            return [];
        }
        
        // プロパティのエントリを取得
        const propertyEntries: [string, any][] = [];
        
        try {
            // Entities.svelte でプロパティを直接設定しているので、
            // その値を直接取得する
            const props = selectedEntity.properties as any;
            
            // プロパティ名を直接取得
            const directProps = ['address', 'coordinates', 'area', 'established', 'opened', 
                               'height', 'website', 'platforms', 'dailyPassengers'];
            
            directProps.forEach(propName => {
                if (propName in props) {
                    // プロパティが存在する場合
                    propertyEntries.push([propName, props[propName]]);
                }
            });
            
            // 直接定義したプロパティがない場合は、他のアプローチを試みる
            if (propertyEntries.length === 0) {
                // まずpropertyNamesがある場合はそれを使う
                if (Array.isArray(props.propertyNames)) {
                    props.propertyNames.forEach((name: string) => {
                        try {
                            // getValue メソッドがある場合
                            if (typeof props.getValue === 'function') {
                                const value = props.getValue(name);
                                propertyEntries.push([name, value]);
                            } else {
                                // 直接アクセス
                                propertyEntries.push([name, props[name]]);
                            }
                        } catch (e) {
                            console.error(`プロパティ ${name} の取得に失敗:`, e);
                        }
                    });
                } else {
                    // 一般的なオブジェクトとしてすべてのプロパティを取得
                    Object.keys(props).forEach(key => {
                        if (!['propertyNames', 'getValue', 'getPropertyNames', 'getType', 
                             'getDefinitionChanged'].includes(key)) {
                            propertyEntries.push([key, props[key]]);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('プロパティの取得中にエラーが発生しました:', error);
        }
        
        return propertyEntries;
    }
</script>

{#if isPopupOpen && selectedEntity}
    <div 
        class="bg-white/95 rounded border-l-3 border-blue-500 shadow-lg max-w-[400px] min-w-[250px] z-[1000] -translate-x-1/2 -translate-y-full -mt-2.5 overflow-auto max-h-[400px] transition-all duration-250 ease-out will-change-transform antialiased opacity-90" 
        style="position: absolute; left: {popupPosition.x}px; top: {popupPosition.y}px;"
        data-entity-id={selectedEntity.id}
    >
        <div class="flex justify-between items-center p-2 px-3 bg-gray-100 border-b border-gray-300">
            <h3 class="m-0 text-base font-semibold">{selectedEntity.name || 'Entity'}</h3>
            <div class="flex items-center gap-1">
                <button on:click={closePopup} class="border-none bg-transparent text-lg cursor-pointer p-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10" title="閉じる">×</button>
            </div>
        </div>
        
        <div class="p-3">
            {#if selectedEntity.description}
                <p class="mt-0 mb-3 text-sm">{formatPropertyValue(selectedEntity.description)}</p>
            {/if}
            
            <div class="properties">
                <h4 class="mt-0 mb-2 text-sm font-semibold">プロパティ</h4>
                {#if getPropertyEntries().length > 0}
                    <table class="w-full border-collapse">
                        <tbody>
                            {#each getPropertyEntries() as [key, value]}
                                <tr>
                                    <td class="py-1 px-2 border-b border-gray-200 text-sm font-medium text-gray-600">{key}</td>
                                    <td class="py-1 px-2 border-b border-gray-200 text-sm break-words">{formatPropertyValue(value)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {:else}
                    <p>プロパティがありません</p>
                {/if}
            </div>
        </div>
        <!-- ポップアップの視認性を高めるための接続線 -->
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white/95 filter drop-shadow"></div>
    </div>
{/if}
