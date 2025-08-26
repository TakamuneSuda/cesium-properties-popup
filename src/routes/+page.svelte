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

	// Property selection mode
	type PropertyMode = 'all' | 'whitelist' | 'whitelist-with-names';
	let propertyMode: PropertyMode = 'whitelist-with-names';

	// Property configurations
	interface PropertyItem {
		code: string;
		name: string;
		selected: boolean;
		displayType?: import('$lib/types').PropertyDisplayType;
	}

	// Initialize properties for each dataset
	let roadStationProperties: PropertyItem[] = [
		{ code: 'P35_006', name: 'Road Station Name', selected: true },
		{ code: 'P35_003', name: 'Prefecture', selected: true },
		{ code: 'P35_004', name: 'City', selected: true },
		{
			code: 'P35_007',
			name: 'Website URL',
			selected: true,
			displayType: 'link'
		}
	];

	let railwayProperties: PropertyItem[] = [
		{ code: 'N02_003', name: 'Line Name', selected: true },
		{ code: 'N02_004', name: 'Operator', selected: true },
		{ code: 'N02_001', name: 'Railway Type', selected: false },
		{ code: 'N02_002', name: 'Business Type', selected: false }
	];

	let lakeProperties: PropertyItem[] = [
		{ code: 'W09_001', name: 'Lake Name', selected: true },
		{ code: 'W09_002', name: 'Administrative Code', selected: false },
		{ code: 'W09_003', name: 'Max Depth', selected: false },
		{ code: 'W09_004', name: 'Water Surface Elevation', selected: false }
	];

	let contentsProperties: PropertyItem[] = [
		{ code: 'name', name: 'Name', selected: true },
		{
			code: 'HP',
			name: 'Homepage',
			selected: true,
			displayType: 'link'
		},
		{
			code: 'Image',
			name: 'Image',
			selected: true,
			displayType: 'image'
		},
		{ code: 'Email', name: 'Email Address', selected: true, displayType: 'email' }
	];

	// Manage popup options with store
	const popupOptions = writable<EntityPopupOptions>({
		enableHover: true,
		properties: undefined,
		styleOptions: {
			width: 300,
			height: 300,
			overflowY: 'auto',
			popupClass: 'light-theme'
		}
	});

	// Initialize properties on mount
	$: if (propertyMode === 'whitelist-with-names') {
		updatePropertyMode(propertyMode);
	}

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

	// Get selected properties in order
	function getSelectedPropertiesInOrder(): string[] | { name: string; displayName: string }[] {
		const allProps = [
			...roadStationProperties,
			...railwayProperties,
			...lakeProperties,
			...contentsProperties
		];
		const selectedProps = allProps.filter((p) => p.selected);

		if (propertyMode === 'whitelist') {
			return selectedProps.map((p) => p.code);
		} else if (propertyMode === 'whitelist-with-names') {
			return selectedProps.map((p) => ({
				name: p.code,
				displayName: p.name,
				displayType: p.displayType
			}));
		}
		return [];
	}

	// Update property mode
	function updatePropertyMode(mode: PropertyMode) {
		propertyMode = mode;
		const newOptions = { ...$popupOptions };

		switch (mode) {
			case 'all':
				newOptions.properties = undefined;
				break;
			case 'whitelist':
			case 'whitelist-with-names':
				newOptions.properties = getSelectedPropertiesInOrder();
				break;
		}

		popupOptions.set(newOptions);
	}

	// Toggle property selection
	function toggleProperty(properties: PropertyItem[], code: string) {
		const prop = properties.find((p) => p.code === code);
		if (prop) {
			prop.selected = !prop.selected;
			properties = [...properties]; // Trigger reactivity
			if (propertyMode === 'whitelist' || propertyMode === 'whitelist-with-names') {
				updatePropertyMode(propertyMode);
			}
		}
	}

	// Move property up within its dataset
	function movePropertyUp(properties: PropertyItem[], code: string) {
		const index = properties.findIndex((p) => p.code === code);
		if (index > 0) {
			// Swap elements in array
			const newProperties = [...properties];
			[newProperties[index - 1], newProperties[index]] = [
				newProperties[index],
				newProperties[index - 1]
			];

			// Update the appropriate array
			if (properties === roadStationProperties) roadStationProperties = newProperties;
			else if (properties === railwayProperties) railwayProperties = newProperties;
			else if (properties === lakeProperties) lakeProperties = newProperties;
			else if (properties === contentsProperties) contentsProperties = newProperties;

			if (propertyMode === 'whitelist' || propertyMode === 'whitelist-with-names') {
				updatePropertyMode(propertyMode);
			}
		}
	}

	// Move property down within its dataset
	function movePropertyDown(properties: PropertyItem[], code: string) {
		const index = properties.findIndex((p) => p.code === code);
		if (index < properties.length - 1 && index >= 0) {
			// Swap elements in array
			const newProperties = [...properties];
			[newProperties[index], newProperties[index + 1]] = [
				newProperties[index + 1],
				newProperties[index]
			];

			// Update the appropriate array
			if (properties === roadStationProperties) roadStationProperties = newProperties;
			else if (properties === railwayProperties) railwayProperties = newProperties;
			else if (properties === lakeProperties) lakeProperties = newProperties;
			else if (properties === contentsProperties) contentsProperties = newProperties;

			if (propertyMode === 'whitelist' || propertyMode === 'whitelist-with-names') {
				updatePropertyMode(propertyMode);
			}
		}
	}
</script>

<div class="flex h-screen w-screen">
	<!-- Map area -->
	<div class="relative flex-1 overflow-hidden">
		<Map popupOptions={$popupOptions} />
	</div>

	<!-- Control panel -->
	<div class="w-80 overflow-y-auto bg-white p-4 shadow-lg">
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

		<!-- Property selection -->
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-semibold">Property Selection</h3>

			<div class="mb-3">
				<label for="display-mode" class="mb-1 block">Display Mode</label>
				<select
					id="display-mode"
					class="w-full rounded border p-2"
					value={propertyMode}
					onchange={(e) => updatePropertyMode(e.currentTarget.value as PropertyMode)}
				>
					<option value="all">Show All Properties</option>
					<option value="whitelist">Select Properties (Codes)</option>
					<option value="whitelist-with-names">Select Properties (Names)</option>
				</select>
			</div>

			{#if propertyMode === 'whitelist' || propertyMode === 'whitelist-with-names'}
				<!-- Display type demo description -->
				<div class="mb-3 rounded bg-blue-50 p-3 text-sm">
					<p class="font-medium">Display Type Demo:</p>
					<ul class="mt-1 space-y-1 text-xs">
						<li>• <strong>link</strong>: Display homepage URL as clickable link</li>
						<li>• <strong>image</strong>: Display image URL as image</li>
						<li>• <strong>email</strong>: Display email address as mailto link</li>
					</ul>
				</div>

				<div class="mb-3">
					<div class="mb-1 font-medium">Select and Order Properties</div>

					<div class="space-y-3">
						<!-- Point Data -->
						<div class="rounded border p-2">
							<p class="mb-2 text-sm font-medium text-gray-700">Point Data:</p>
							<div class="space-y-1">
								{#each roadStationProperties as prop, index (prop.code)}
									<div class="flex items-center justify-between">
										<label class="flex flex-1 items-center">
											<input
												type="checkbox"
												checked={prop.selected}
												onchange={() => toggleProperty(roadStationProperties, prop.code)}
												class="mr-2"
											/>
											<span class="flex-1">
												{prop.name} ({prop.code})
												{#if prop.displayType}
													<span class="ml-1 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">
														{prop.displayType}
													</span>
												{/if}
											</span>
										</label>
										<div class="flex gap-1">
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyUp(roadStationProperties, prop.code)}
												disabled={index === 0}
											>
												↑
											</button>
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyDown(roadStationProperties, prop.code)}
												disabled={index === roadStationProperties.length - 1}
											>
												↓
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Line Data -->
						<div class="rounded border p-2">
							<p class="mb-2 text-sm font-medium text-gray-700">Line Data:</p>
							<div class="space-y-1">
								{#each railwayProperties as prop, index (prop.code)}
									<div class="flex items-center justify-between">
										<label class="flex flex-1 items-center">
											<input
												type="checkbox"
												checked={prop.selected}
												onchange={() => toggleProperty(railwayProperties, prop.code)}
												class="mr-2"
											/>
											<span class="flex-1">
												{prop.name} ({prop.code})
												{#if prop.displayType}
													<span class="ml-1 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">
														{prop.displayType}
													</span>
												{/if}
											</span>
										</label>
										<div class="flex gap-1">
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyUp(railwayProperties, prop.code)}
												disabled={index === 0}
											>
												↑
											</button>
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyDown(railwayProperties, prop.code)}
												disabled={index === railwayProperties.length - 1}
											>
												↓
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Polygon Data -->
						<div class="rounded border p-2">
							<p class="mb-2 text-sm font-medium text-gray-700">Polygon Data:</p>
							<div class="space-y-1">
								{#each lakeProperties as prop, index (prop.code)}
									<div class="flex items-center justify-between">
										<label class="flex flex-1 items-center">
											<input
												type="checkbox"
												checked={prop.selected}
												onchange={() => toggleProperty(lakeProperties, prop.code)}
												class="mr-2"
											/>
											<span class="flex-1">
												{prop.name} ({prop.code})
												{#if prop.displayType}
													<span class="ml-1 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">
														{prop.displayType}
													</span>
												{/if}
											</span>
										</label>
										<div class="flex gap-1">
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyUp(lakeProperties, prop.code)}
												disabled={index === 0}
											>
												↑
											</button>
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyDown(lakeProperties, prop.code)}
												disabled={index === lakeProperties.length - 1}
											>
												↓
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<!-- Contents Data -->
						<div class="rounded border p-2">
							<p class="mb-2 text-sm font-medium text-gray-700">Contents Data:</p>
							<div class="space-y-1">
								{#each contentsProperties as prop, index (prop.code)}
									<div class="flex items-center justify-between">
										<label class="flex flex-1 items-center">
											<input
												type="checkbox"
												checked={prop.selected}
												onchange={() => toggleProperty(contentsProperties, prop.code)}
												class="mr-2"
											/>
											<span class="flex-1">
												{prop.name} ({prop.code})
												{#if prop.displayType}
													<span class="ml-1 rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">
														{prop.displayType}
													</span>
												{/if}
											</span>
										</label>
										<div class="flex gap-1">
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyUp(contentsProperties, prop.code)}
												disabled={index === 0}
											>
												↑
											</button>
											<button
												class="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
												onclick={() => movePropertyDown(contentsProperties, prop.code)}
												disabled={index === contentsProperties.length - 1}
											>
												↓
											</button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/if}
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
				propertyMode = 'all';
				roadStationProperties = [
					{ code: 'P35_006', name: 'Road Station Name', selected: true },
					{ code: 'P35_003', name: 'Prefecture', selected: true },
					{ code: 'P35_004', name: 'City', selected: true },
					{
						code: 'P35_007',
						name: 'Website URL',
						selected: true,
						displayType: 'link'
					}
				];
				railwayProperties = [
					{ code: 'N02_003', name: 'Line Name', selected: true },
					{ code: 'N02_004', name: 'Operator', selected: true },
					{ code: 'N02_001', name: 'Railway Type', selected: false },
					{ code: 'N02_002', name: 'Business Type', selected: false }
				];
				lakeProperties = [
					{ code: 'W09_001', name: 'Lake Name', selected: true },
					{ code: 'W09_002', name: 'Administrative Code', selected: false },
					{ code: 'W09_003', name: 'Max Depth', selected: false },
					{ code: 'W09_004', name: 'Water Surface Elevation', selected: false }
				];
				contentsProperties = [
					{ code: 'name', name: 'Name', selected: true },
					{
						code: 'HP',
						name: 'Homepage',
						selected: true,
						displayType: 'link'
					},
					{
						code: 'Image',
						name: 'Image',
						selected: true,
						displayType: 'image'
					},
					{ code: 'Email', name: 'Email Address', selected: true, displayType: 'email' }
				];
				popupOptions.set({
					enableHover: true,
					properties: undefined,
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
