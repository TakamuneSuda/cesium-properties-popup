<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { CESIUM_INITIAL_OPTIONS } from './cesiumUtil';
	import type * as CesiumType from 'cesium';
	import Entities from './Entities.svelte';
	import { EntityPopup as LibraryEntityPopup } from '$lib';

	let { popupOptions } = $props();

	// Click event handler
	function handleClick(e: MouseEvent) {
		if (viewer && cesium) {
			const pick = viewer.scene.pick(new cesium.Cartesian2(e.clientX, e.clientY));
			console.log('Picked object:', pick);
			if (pick?.id) {
				console.log('Entity details:', {
					id: pick.id.id,
					name: pick.id.name,
					properties: pick.id.properties,
					type: pick.id.constructor.name,
					hasPolyline: !!pick.id.polyline,
					primitive: pick.primitive?.constructor.name
				});
			}
		}
	}

	// Cesium module is dynamically imported, so use import type
	let cesium: typeof CesiumType | undefined = $state();
	let viewer: CesiumType.Viewer | undefined = $state();
	let viewerReady = $state(false); // Flag to track viewer readiness

	onMount(async (): Promise<void> => {
		if (!browser) return;

		try {
			// Import Cesium module only in browser
			cesium = (await import('cesium')) as typeof CesiumType;
			await import('cesium/Build/Cesium/Widgets/widgets.css');

			// Get necessary exports from Cesium module
			const {
				Ion,
				UrlTemplateImageryProvider,
				Viewer: CesiumViewer,
				Cartesian3,
				Math: CesiumMath
			} = cesium;

			// Set access token
			Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;

			// Configure imagery provider (GSI)
			const gsiSeamless = new UrlTemplateImageryProvider({
				url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
			});

			// Configure CESIUM_BASE_URL
			const baseUrl = import.meta.env.DEV ? '/node_modules/cesium/Build/Cesium/' : '/Cesium/';
			// @ts-expect-error - Global CESIUM_BASE_URL setting for Cesium
			window.CESIUM_BASE_URL = baseUrl;

			// Initialize Viewer (assign to viewer variable)
			viewer = new CesiumViewer('cesiumContainer', {
				...CESIUM_INITIAL_OPTIONS
			});

			// Configure terrain provider
			viewer.terrainProvider = await cesium.createWorldTerrainAsync();

			// Add imagery provider
			viewer.imageryLayers.addImageryProvider(gsiSeamless);

			// Set initial camera position
			viewer.camera.setView({
				destination: Cartesian3.fromDegrees(
					139.754409, // Longitude
					35.670355, // Latitude
					5000 // Altitude (meters)
				),
				orientation: {
					heading: CesiumMath.toRadians(0), // View direction (heading)
					pitch: CesiumMath.toRadians(-30), // Pitch (tilt)
					roll: 0 // Roll (rotation)
				}
			});
			// Disable transparency against terrain
			viewer.scene.globe.depthTestAgainstTerrain = false;

			// Indicate that viewer is ready
			viewerReady = true;
		} catch (error) {
			console.error('Failed to initialize Cesium:', error);
		}
	});
</script>

<!-- Debug click event listener -->
<svelte:window on:click={handleClick} />

<!-- Container for rendering Cesium -->
<div id="cesiumContainer" class="h-full w-full"></div>
<!-- Display Entities component and EntityPopup when viewer is ready -->
{#if viewerReady && viewer && cesium}
	<Entities {viewer} {cesium} />
	<!-- Use library's EntityPopup component -->
	<LibraryEntityPopup {viewer} {cesium} options={popupOptions} />
{/if}
