<script lang="ts">
	import Map from './cesium/Map.svelte';
	import type { EntityPopupOptions } from '$lib/types';
	import { writable } from 'svelte/store';
	import './themes.css';

	// Theme presets
	const themes = [
		{ id: 'light', name: 'Light Mode', class: 'light-theme' },
		{ id: 'dark', name: 'Dark Mode', class: 'dark-theme' },
		{ id: 'brand', name: 'Brand Theme', class: 'brand-theme' }
	];

	// Manage popup options with store
	const popupOptions = writable<EntityPopupOptions>({
		enableHover: true,
		filterProperties: undefined,
		styleOptions: {
			width: 300,
			height: 300,
			overflowY: 'auto',
			popupClass: 'light-theme'
		}
	});

	// Style options update handler
	function updateStyleOption(option: string, value: string | number) {
		const newOptions = {
			...$popupOptions,
			styleOptions: {
				...$popupOptions.styleOptions,
				[option]: value
			}
		};
		popupOptions.set(newOptions);
	}
</script>

<div class="flex h-screen w-screen">
	<!-- Map area -->
	<div class="relative flex-1 overflow-hidden">
		<Map popupOptions={$popupOptions} />
	</div>

	<!-- Control panel -->
	<div class="w-60 overflow-y-auto bg-white p-4 shadow-lg">
		<h2 class="mb-4 text-xl font-bold">Popup Settings</h2>

		<!-- Basic settings -->
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-semibold">Basic Settings</h3>
			<div class="mb-3">
				<label class="flex items-center">
					<input
						type="checkbox"
						checked={$popupOptions.enableHover}
						onchange={(e) => {
							const newOptions = { ...$popupOptions, enableHover: e.currentTarget.checked };
							popupOptions.set(newOptions);
						}}
						class="mr-2"
					/>
					Show popup on hover
				</label>
			</div>
		</div>

		<!-- Style settings -->
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-semibold">Style Settings</h3>

			<div class="mb-3">
				<label for="popup-width" class="mb-1 block">
					Popup Width: {$popupOptions.styleOptions?.width ?? 400}px
				</label>
				<input
					id="popup-width"
					type="range"
					min="200"
					max="400"
					step="10"
					bind:value={$popupOptions.styleOptions!.width}
					class="w-full"
				/>
			</div>

			<div class="mb-3">
				<label for="popup-height" class="mb-1 block">
					Popup Height: {$popupOptions.styleOptions?.height ?? 300}px
				</label>
				<input
					id="popup-height"
					type="range"
					min="200"
					max="400"
					step="10"
					bind:value={$popupOptions.styleOptions!.height}
					class="w-full"
				/>
			</div>

			<div class="mb-3">
				<label for="popup-theme" class="mb-1 block">Theme</label>
				<select
					id="popup-theme"
					class="w-full rounded border p-2"
					value={$popupOptions.styleOptions!.popupClass}
					onchange={(e) => updateStyleOption('popupClass', e.currentTarget.value)}
				>
					{#each themes as theme (theme.id)}
						<option value={theme.class}>{theme.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Reset button -->
		<button
			class="w-full rounded bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
			onclick={() => {
				popupOptions.set({
					enableHover: true,
					filterProperties: undefined,
					styleOptions: {
						width: 300,
						height: 300,
						overflowY: 'auto',
						popupClass: 'light-theme'
					}
				});
			}}
		>
			Reset to Default Settings
		</button>
	</div>
</div>
