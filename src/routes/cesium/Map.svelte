<script lang="ts">
    import { onMount } from 'svelte';
	import { browser } from '$app/environment';
    import { CESIUM_INITIAL_OPTIONS } from './cesiumUtil';
    import type * as CesiumType from 'cesium';
    import Entities from './Entities.svelte';
    import EntityPopup from './EntityPopup.svelte';

    // Cesium モジュールは動的インポートするので、型は import 型を利用
	let cesium: typeof CesiumType;
	let viewer: CesiumType.Viewer;
	let viewerReady = false; // viewer の準備状態を追跡するフラグ


	onMount(async (): Promise<void> => {
		if (!browser) return;

		try {
			// ブラウザ上でのみ Cesium モジュールを動的にインポート
			cesium = (await import('cesium')) as typeof CesiumType;
			await import('cesium/Build/Cesium/Widgets/widgets.css');

			// Cesium モジュールから必要なエクスポートを取得
			const {
				Ion,
				UrlTemplateImageryProvider,
				Viewer: CesiumViewer,
				CesiumTerrainProvider,
				IonResource,
				Cartesian3,
				Math: CesiumMath,
				Cartographic
			} = cesium;

			// アクセストークンの設定
			Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN_PLATEAU_TERRAIN;

			// 画像プロバイダーの設定（GSI）
			const gsiSeamless = new UrlTemplateImageryProvider({
				url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
			});

			// CESIUM_BASE_URL の設定
			const baseUrl = import.meta.env.DEV ? '/node_modules/cesium/Build/Cesium/' : '/Cesium/';
			window.CESIUM_BASE_URL = baseUrl;

			// Viewer の初期化（viewer 変数に代入）
			viewer = new CesiumViewer('cesiumContainer', {
				...CESIUM_INITIAL_OPTIONS
			});

			// 地形プロバイダーの設定
			viewer.terrainProvider = await CesiumTerrainProvider.fromUrl(
				IonResource.fromAssetId(770371, {})
			);

			// 画像プロバイダーを追加
			viewer.imageryLayers.addImageryProvider(gsiSeamless);

			// カメラの初期位置を設定
			viewer.camera.setView({
				destination: Cartesian3.fromDegrees(
					139.754409, // 経度
					35.670355,  // 緯度
					5000      // 高度（メートル）
				),
				orientation: {
					heading: CesiumMath.toRadians(0), // 視点の向き（ヘディング）
					pitch: CesiumMath.toRadians(-30), // ピッチ（傾き）
					roll: 0 // ロール（回転）
				}
			});


			// 透過させないようにする
			viewer.scene.globe.depthTestAgainstTerrain = true;
			
			// viewerの準備ができたことを示す
			viewerReady = true;

		} catch (error) {
			console.error('Cesium の初期化に失敗しました:', error);
		}
	});
</script>


<!-- Cesium を描画するコンテナ -->
<div id="cesiumContainer" class="h-full w-full"></div>

<!-- viewerが準備できたらEntitiesコンポーネントを表示 -->
{#if viewerReady && viewer && cesium}
    <Entities {viewer} {cesium} />
    <EntityPopup {viewer} {cesium} />
{/if}