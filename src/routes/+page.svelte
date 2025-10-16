<script lang="ts">
	import Map from './cesium/Map.svelte';
	import type { EntityPopupOptions, EntityEventContext, EntityPopupAPI } from '$lib/types';
	import { writable } from 'svelte/store';
	import { untrack } from 'svelte';
	import './themes.css';

	// Reference to EntityPopup component for programmatic control
	let popupApi: EntityPopupAPI | undefined = $state(undefined);

	// Callback event tracking
	interface CallbackEvent {
		id: string;
		timestamp: string;
		type: 'click' | 'hover' | 'empty';
		entityId?: string;
		dataSourceName?: string;
		position: { x: number; y: number };
	}

	let callbackEvents = $state<CallbackEvent[]>([]);
	let callbacksEnabled = $state(true);
	const maxEvents = 10; // Keep only last 10 events
	let eventIdCounter = 0;

	function addCallbackEvent(event: Omit<CallbackEvent, 'id'>) {
		const eventWithId = { ...event, id: `event-${++eventIdCounter}` };
		callbackEvents = [eventWithId, ...callbackEvents].slice(0, maxEvents);
	}

	// Theme presets
	const themes = [
		{ id: 'light', name: 'Light Mode', class: 'light-theme' },
		{ id: 'dark', name: 'Dark Mode', class: 'dark-theme' },
		{ id: 'brand', name: 'Brand Theme', class: 'brand-theme' }
	];

	// Property selection mode
	type PropertyMode = 'all' | 'whitelist' | 'whitelist-with-names' | 'layer-specific';
	let propertyMode: PropertyMode = 'whitelist-with-names';

	// Layer filter mode
	type FilterMode = 'individual' | 'regex';
	let filterMode: FilterMode = 'individual';

	// Regex filter settings
	type RegexMode = 'include' | 'exclude';
	let regexMode: RegexMode = 'exclude';
	let regexPatternInput: string = '';
	let regexPatterns: string[] = [];

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

	// Layer control settings
	interface LayerItem {
		name: string;
		displayName: string;
		enabled: boolean;
	}

	let layers: LayerItem[] = [
		{ name: 'road-stations', displayName: 'Road Stations', enabled: true },
		{ name: 'railways', displayName: 'Railways', enabled: true },
		{ name: 'lakes', displayName: 'Lakes', enabled: true },
		{ name: 'contents', displayName: 'Contents', enabled: true }
	];

	// Layer-specific configuration
	let useLayerSpecificConfig = $state(false);
	let layerSpecificEnabled = $state(false);

	// Calculate excluded DataSources based on disabled layers
	let excludedDataSources = $derived(
		layers.filter((layer) => !layer.enabled).map((layer) => layer.name)
	);

	// Helper function to test regex pattern
	function testRegexPattern(pattern: string, name: string): boolean {
		try {
			const regex = new RegExp(pattern);
			return regex.test(name);
		} catch {
			return false;
		}
	}

	// Add regex pattern
	function addRegexPattern() {
		if (regexPatternInput.trim()) {
			// Validate regex pattern
			try {
				new RegExp(regexPatternInput);
				regexPatterns = [...regexPatterns, regexPatternInput];
				regexPatternInput = '';
				updatePopupOptionsFromRegex();
			} catch (e) {
				alert('Invalid regex pattern: ' + (e as Error).message);
			}
		}
	}

	// Remove regex pattern
	function removeRegexPattern(index: number) {
		regexPatterns = regexPatterns.filter((_, i) => i !== index);
		updatePopupOptionsFromRegex();
	}

	// Update popup options from regex patterns
	function updatePopupOptionsFromRegex() {
		// Use untrack to prevent reading $popupOptions from creating a reactive dependency
		const newOptions = { ...untrack(() => $popupOptions) };

		if (filterMode === 'regex') {
			if (regexPatterns.length > 0) {
				const patterns = regexPatterns.map((p) => new RegExp(p));

				if (regexMode === 'exclude') {
					newOptions.excludeDataSources = patterns;
					newOptions.includeDataSources = undefined;
					console.log('🔴 Regex Exclude Mode:', patterns);
				} else {
					newOptions.includeDataSources = patterns;
					newOptions.excludeDataSources = undefined;
					console.log('✅ Regex Include Mode:', patterns);
				}
			} else {
				// No patterns: clear filters
				newOptions.excludeDataSources = undefined;
				newOptions.includeDataSources = undefined;
				console.log('⚪ No regex patterns - showing all layers');
			}
		} else if (filterMode === 'individual') {
			newOptions.excludeDataSources = excludedDataSources;
			newOptions.includeDataSources = undefined;
			console.log('📋 Individual Mode - Excluded:', excludedDataSources);
		}

		popupOptions.set(newOptions);
		console.log('🔧 Updated popup options:', newOptions);
	}

	// Example: Close popup on click (toggle this feature)
	let closePopupOnClick = $state(false);

	// Callback functions
	function handleEntityClick(context: EntityEventContext) {
		if (!callbacksEnabled) return;

		addCallbackEvent({
			timestamp: new Date().toLocaleTimeString(),
			type: 'click',
			entityId: context.entity.id,
			dataSourceName: context.dataSourceName,
			position: context.position
		});

		console.log('Entity clicked:', context);

		// Example: Programmatically close popup after click
		if (closePopupOnClick && popupApi) {
			// Close popup after a short delay
			setTimeout(() => {
				popupApi?.close();
			}, 1000);
		}
	}

	function handleEntityHover(context: EntityEventContext) {
		if (!callbacksEnabled) return;

		addCallbackEvent({
			timestamp: new Date().toLocaleTimeString(),
			type: 'hover',
			entityId: context.entity.id,
			dataSourceName: context.dataSourceName,
			position: context.position
		});
	}

	function handleEmptyClick(position: { x: number; y: number }) {
		if (!callbacksEnabled) return;

		addCallbackEvent({
			timestamp: new Date().toLocaleTimeString(),
			type: 'empty',
			position: position
		});

		console.log('Empty space clicked at:', position);
	}

	// Manage popup options with store
	const popupOptions = writable<EntityPopupOptions>({
		enableHover: true,
		properties: undefined,
		excludeDataSources: excludedDataSources,
		onEntityClick: handleEntityClick,
		onEntityHover: handleEntityHover,
		onEmptyClick: handleEmptyClick,
		styleOptions: {
			width: 300,
			height: 300,
			overflowY: 'auto',
			popupClass: 'light-theme'
		}
	});

	// Initialize properties on mount
	$effect(() => {
		if (propertyMode === 'whitelist-with-names') {
			updatePropertyMode(propertyMode);
		}
	});

	// Reactive: Watch filter mode, regex mode, regex patterns, and layers changes
	$effect(() => {
		// Update when filterMode, regexMode, regexPatterns, or excludedDataSources change
		updatePopupOptionsFromRegex();
	});

	// Style options update handler
	function updateStyleOption(option: string, value: string | number) {
		const currentOptions = untrack(() => $popupOptions);
		const newOptions = {
			...currentOptions,
			styleOptions: {
				...currentOptions.styleOptions,
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

	// Get layer-specific property configurations
	function getLayerPropertyConfigs(): import('$lib/types').LayerPropertyConfig[] {
		return [
			{
				layerPattern: 'road-stations',
				properties: [
					{ type: 'static', label: 'Category', value: 'Road Station' },
					...roadStationProperties
						.filter((p) => p.selected)
						.map((p) => ({
							name: p.code,
							displayName: p.name,
							displayType: p.displayType
						}))
				]
			},
			{
				layerPattern: 'railways',
				properties: [
					{ type: 'static', label: 'Category', value: 'Railway' },
					...railwayProperties
						.filter((p) => p.selected)
						.map((p) => ({
							name: p.code,
							displayName: p.name,
							displayType: p.displayType
						})),
					{ type: 'static', label: 'Data Source', value: 'National Land Numerical Information' }
				]
			},
			{
				layerPattern: 'lakes',
				properties: [
					{ type: 'static', label: 'Category', value: 'Lake' },
					...lakeProperties
						.filter((p) => p.selected)
						.map((p) => ({
							name: p.code,
							displayName: p.name,
							displayType: p.displayType
						}))
				]
			},
			{
				layerPattern: 'contents',
				properties: [
					{ type: 'static', label: 'Category', value: 'Tourist Spot' },
					...contentsProperties
						.filter((p) => p.selected)
						.map((p) => ({
							name: p.code,
							displayName: p.name,
							displayType: p.displayType
						})),
					{ type: 'static', label: 'Info', value: 'Click for more details', displayType: 'text' }
				]
			}
		];
	}

	// Update property mode
	function updatePropertyMode(mode: PropertyMode) {
		propertyMode = mode;
		const newOptions = { ...untrack(() => $popupOptions) };

		switch (mode) {
			case 'all':
				newOptions.properties = undefined;
				newOptions.layerPropertyConfigs = undefined;
				break;
			case 'whitelist':
			case 'whitelist-with-names':
				newOptions.properties = getSelectedPropertiesInOrder();
				newOptions.layerPropertyConfigs = undefined;
				break;
			case 'layer-specific':
				newOptions.layerPropertyConfigs = getLayerPropertyConfigs();
				newOptions.properties = [{ name: 'name', displayName: 'Name' }]; // Default fallback
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
			if (
				propertyMode === 'whitelist' ||
				propertyMode === 'whitelist-with-names' ||
				propertyMode === 'layer-specific'
			) {
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

			if (
				propertyMode === 'whitelist' ||
				propertyMode === 'whitelist-with-names' ||
				propertyMode === 'layer-specific'
			) {
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

			if (
				propertyMode === 'whitelist' ||
				propertyMode === 'whitelist-with-names' ||
				propertyMode === 'layer-specific'
			) {
				updatePropertyMode(propertyMode);
			}
		}
	}
</script>

<div class="flex h-screen w-screen">
	<!-- Map area -->
	<div class="relative flex-1 overflow-hidden">
		<Map bind:popupApi popupOptions={$popupOptions} />
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
							const newOptions = {
								...untrack(() => $popupOptions),
								enableHover: e.currentTarget.checked
							};
							popupOptions.set(newOptions);
						}}
						class="mr-2"
					/>
					Show popup on hover
				</label>
			</div>
		</div>

		<!-- Layer control settings -->
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-semibold">Layer Control</h3>

			<!-- Filter Mode Selector -->
			<div class="mb-3">
				<label for="filter-mode" class="mb-1 block text-sm font-medium">Filter Mode</label>
				<select
					id="filter-mode"
					class="w-full rounded border p-2"
					bind:value={filterMode}
					onchange={() => updatePopupOptionsFromRegex()}
				>
					<option value="individual">Individual Selection (Checkbox)</option>
					<option value="regex">Regex Pattern (String or RegExp)</option>
				</select>
			</div>

			{#if filterMode === 'individual'}
				<!-- Individual checkbox mode -->
				<div class="mb-3 rounded bg-yellow-50 p-3 text-sm">
					<p class="text-xs">Uncheck to disable popups for that layer</p>
				</div>
				<div class="space-y-2">
					{#each layers as layer (layer.name)}
						<label class="flex items-center rounded border p-2 hover:bg-gray-50">
							<input type="checkbox" bind:checked={layer.enabled} class="mr-3" />
							<span class="flex-1">
								{layer.displayName}
							</span>
							<span class="ml-2 rounded bg-gray-200 px-2 py-1 text-xs text-gray-600">
								{layer.name}
							</span>
						</label>
					{/each}
				</div>
				<div class="mt-3 rounded bg-blue-50 p-2 text-xs text-blue-700">
					Excluded layers: {excludedDataSources.length === 0
						? 'None'
						: excludedDataSources.join(', ')}
				</div>
			{:else if filterMode === 'regex'}
				<!-- Regex pattern mode -->
				<div class="mb-3 rounded bg-yellow-50 p-3 text-sm">
					<p class="text-xs font-medium">RegExp Pattern Mode</p>
					<p class="mt-1 text-xs">Enter JavaScript regex patterns to filter layers</p>
				</div>

				<!-- Regex mode selector (include/exclude) -->
				<div class="mb-3">
					<label class="mb-1 block text-sm font-medium">Pattern Type</label>
					<div class="flex gap-3">
						<label class="flex items-center">
							<input
								type="radio"
								bind:group={regexMode}
								value="exclude"
								onchange={() => updatePopupOptionsFromRegex()}
								class="mr-1"
							/>
							<span class="text-sm">Exclude (Blacklist)</span>
						</label>
						<label class="flex items-center">
							<input
								type="radio"
								bind:group={regexMode}
								value="include"
								onchange={() => updatePopupOptionsFromRegex()}
								class="mr-1"
							/>
							<span class="text-sm">Include (Whitelist)</span>
						</label>
					</div>
				</div>

				<!-- Pattern input -->
				<div class="mb-3">
					<label for="regex-pattern" class="mb-1 block text-sm font-medium"> RegExp Pattern </label>
					<div class="flex gap-2">
						<input
							id="regex-pattern"
							type="text"
							bind:value={regexPatternInput}
							placeholder="e.g., ^road-.* or lakes|contents"
							class="flex-1 rounded border p-2 font-mono text-sm"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									addRegexPattern();
								}
							}}
						/>
						<button
							class="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
							onclick={() => addRegexPattern()}
						>
							Add
						</button>
					</div>
					<p class="mt-1 text-xs text-gray-500">Press Enter or click Add to add the pattern</p>
				</div>

				<!-- Pattern presets -->
				<div class="mb-3">
					<p class="mb-1 text-sm font-medium">Pattern Examples:</p>
					<div class="grid grid-cols-2 gap-2">
						<button
							class="rounded border bg-white p-2 text-left text-xs hover:bg-gray-50"
							onclick={() => (regexPatternInput = '^road-.*')}
						>
							<code>^road-.*</code>
							<br />
							<span class="text-gray-500">Starts with "road-"</span>
						</button>
						<button
							class="rounded border bg-white p-2 text-left text-xs hover:bg-gray-50"
							onclick={() => (regexPatternInput = '.*-stations$')}
						>
							<code>.*-stations$</code>
							<br />
							<span class="text-gray-500">Ends with "-stations"</span>
						</button>
						<button
							class="rounded border bg-white p-2 text-left text-xs hover:bg-gray-50"
							onclick={() => (regexPatternInput = 'road|rail')}
						>
							<code>road|rail</code>
							<br />
							<span class="text-gray-500">Contains "road" OR "rail"</span>
						</button>
						<button
							class="rounded border bg-white p-2 text-left text-xs hover:bg-gray-50"
							onclick={() => (regexPatternInput = '^(?!lakes).*')}
						>
							<code>^(?!lakes).*</code>
							<br />
							<span class="text-gray-500">NOT "lakes"</span>
						</button>
					</div>
				</div>

				<!-- Active patterns list -->
				{#if regexPatterns.length > 0}
					<div class="mb-3">
						<p class="mb-1 text-sm font-medium">Active Patterns:</p>
						<div class="space-y-1">
							{#each regexPatterns as pattern, i (i)}
								<div class="flex items-center justify-between rounded bg-gray-100 p-2">
									<code class="text-xs">{pattern}</code>
									<button
										class="ml-2 text-red-500 hover:text-red-700"
										onclick={() => removeRegexPattern(i)}
										title="Remove pattern"
									>
										✕
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Live preview -->
				<div class="mb-3 rounded border bg-blue-50 p-3">
					<p class="mb-2 text-sm font-medium">Live Preview:</p>
					{#if regexPatternInput}
						<div class="space-y-1 text-xs">
							{#each layers as layer (layer.name)}
								{@const matches = testRegexPattern(regexPatternInput, layer.name)}
								<div class="flex items-center gap-2">
									<span class={matches ? 'text-green-600' : 'text-gray-400'}>
										{matches ? '✓' : '✗'}
									</span>
									<span class={matches ? 'font-medium' : ''}>
										{layer.displayName} (<code>{layer.name}</code>)
									</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-gray-500">Enter a pattern to see matches</p>
					{/if}
				</div>

				<!-- Layer reference -->
				<div class="rounded bg-gray-50 p-2 text-xs">
					<p class="mb-1 font-medium">Available Layers:</p>
					<ul class="space-y-0.5">
						{#each layers as layer (layer.name)}
							<li>
								<code class="rounded bg-white px-1 py-0.5">{layer.name}</code>
								- {layer.displayName}
							</li>
						{/each}
					</ul>
				</div>

				<!-- Current filter status -->
				<div class="mt-3 rounded bg-blue-50 p-2 text-xs text-blue-700">
					<p class="font-medium">Current Filter:</p>
					<p class="mt-1">
						Mode: {regexMode === 'exclude' ? 'Exclude (Blacklist)' : 'Include (Whitelist)'}
					</p>
					<p>Patterns: {regexPatterns.length === 0 ? 'None' : regexPatterns.join(', ')}</p>
				</div>
			{/if}
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
					<option value="layer-specific">Layer-Specific Configuration</option>
				</select>

				{#if propertyMode === 'layer-specific'}
					<div class="mt-2 rounded bg-green-50 p-3 text-xs text-green-800">
						<p class="font-semibold">✨ Layer-Specific Configuration Enabled</p>
						<p class="mt-1">Each layer displays different properties with static text labels:</p>
						<ul class="mt-2 ml-4 list-disc space-y-1">
							<li><strong>Road Stations:</strong> Category label + selected properties</li>
							<li><strong>Railways:</strong> Category label + properties + Data Source info</li>
							<li><strong>Lakes:</strong> Category label + selected properties</li>
							<li><strong>Contents:</strong> Category label + properties + Info text</li>
						</ul>
						<p class="mt-2 text-gray-600">
							Try clicking on different layers to see the difference!
						</p>
					</div>
				{/if}
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

		<!-- Programmatic Control Section -->
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-semibold">Programmatic Control</h3>
			<div class="mb-3 rounded bg-blue-50 p-3 text-sm">
				<p class="font-medium">Control popup via API</p>
				<p class="mt-1 text-xs">
					Use <code class="rounded bg-white px-1">bind:this</code> to access popup methods
				</p>
			</div>

			<div class="mb-3 space-y-2">
				<button
					onclick={() => popupApi?.close()}
					disabled={!popupApi}
					class="w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Close Popup
				</button>

				<div class="rounded border bg-gray-50 p-2 text-xs">
					<p class="mb-1 font-medium">API Status:</p>
					<div class="space-y-1">
						<div>API Available: <strong>{popupApi ? '✓ Yes' : '✗ No'}</strong></div>
						<div>Popup Open: <strong>{popupApi?.isOpen() ? '✓ Yes' : '✗ No'}</strong></div>
						<div>
							Selected Entity: <strong>{popupApi?.getSelectedEntity()?.id ?? 'None'}</strong>
						</div>
					</div>
				</div>

				<div class="mb-3">
					<label class="flex items-center">
						<input type="checkbox" bind:checked={closePopupOnClick} class="mr-2" />
						<span class="text-sm">Auto-close popup 1s after click (Demo)</span>
					</label>
				</div>
			</div>
		</div>

		<!-- Callback Events Section -->
		<div class="mb-6">
			<h3 class="mb-2 text-lg font-semibold">Event Callbacks</h3>
			<div class="mb-3">
				<label class="flex items-center">
					<input type="checkbox" bind:checked={callbacksEnabled} class="mr-2" />
					Enable callback logging
				</label>
			</div>

			{#if callbacksEnabled}
				<div class="mb-2 flex justify-between">
					<span class="text-sm font-medium">Recent Events ({callbackEvents.length})</span>
					<button
						onclick={() => (callbackEvents = [])}
						class="text-xs text-blue-600 hover:underline"
					>
						Clear
					</button>
				</div>

				<div class="max-h-60 space-y-2 overflow-y-auto rounded border bg-gray-50 p-2">
					{#if callbackEvents.length === 0}
						<p class="text-center text-sm text-gray-500">
							Click or hover over entities to see callback events
						</p>
					{:else}
						{#each callbackEvents as event (event.id)}
							<div
								class="rounded border bg-white p-2 text-xs {event.type === 'click'
									? 'border-l-4 border-l-blue-500'
									: event.type === 'hover'
										? 'border-l-4 border-l-green-500'
										: 'border-l-4 border-l-gray-400'}"
							>
								<div class="mb-1 flex items-center justify-between">
									<span class="font-semibold text-gray-700 uppercase">{event.type}</span>
									<span class="text-gray-500">{event.timestamp}</span>
								</div>
								{#if event.entityId}
									<div class="text-gray-600">
										<div>ID: {event.entityId}</div>
										{#if event.dataSourceName}
											<div>Layer: {event.dataSourceName}</div>
										{/if}
										<div>
											Position: ({Math.round(event.position.x)}, {Math.round(event.position.y)})
										</div>
									</div>
								{:else}
									<div class="text-gray-600">
										Empty space at ({Math.round(event.position.x)}, {Math.round(event.position.y)})
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>

				<div class="mt-2 rounded bg-blue-50 p-2 text-xs text-gray-700">
					<strong>Note:</strong> Callbacks work independently of popup display. Check the browser console
					for detailed logs.
				</div>
			{/if}
		</div>

		<!-- Debug: Current Options Configuration -->
		<div class="mb-6 border-t pt-6">
			<h3 class="mb-2 text-lg font-semibold">🔍 Current Options (Debug)</h3>
			<div class="mb-2 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
				<strong>Note:</strong> This shows the actual options passed to EntityPopup
			</div>

			<div class="space-y-3">
				<!-- Basic Options -->
				<div>
					<p class="mb-1 text-sm font-medium text-gray-700">Basic Options:</p>
					<div class="rounded bg-gray-50 p-2 font-mono text-xs">
						<div>enableHover: <strong>{$popupOptions.enableHover}</strong></div>
						<div>showPopup: <strong>{$popupOptions.showPopup ?? true}</strong></div>
					</div>
				</div>

				<!-- Layer Filters -->
				{#if $popupOptions.includeDataSources || $popupOptions.excludeDataSources}
					<div>
						<p class="mb-1 text-sm font-medium text-gray-700">Layer Filters:</p>
						<div class="rounded bg-gray-50 p-2 font-mono text-xs">
							{#if $popupOptions.includeDataSources}
								<div class="mb-1">
									<span class="text-green-600">includeDataSources:</span>
									<div class="ml-2">
										{JSON.stringify($popupOptions.includeDataSources, null, 2)}
									</div>
								</div>
							{/if}
							{#if $popupOptions.excludeDataSources}
								<div>
									<span class="text-red-600">excludeDataSources:</span>
									<div class="ml-2">
										{JSON.stringify($popupOptions.excludeDataSources, null, 2)}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Properties Configuration -->
				{#if $popupOptions.properties || $popupOptions.layerPropertyConfigs}
					<div>
						<p class="mb-1 text-sm font-medium text-gray-700">Property Configuration:</p>
						<div class="max-h-96 overflow-y-auto rounded bg-gray-50 p-2 font-mono text-xs">
							{#if $popupOptions.layerPropertyConfigs}
								<div class="mb-2">
									<span class="font-semibold text-purple-600">layerPropertyConfigs:</span>
									<pre class="mt-1 whitespace-pre-wrap">{JSON.stringify(
											$popupOptions.layerPropertyConfigs,
											null,
											2
										)}</pre>
								</div>
							{/if}
							{#if $popupOptions.properties}
								<div>
									<span class="font-semibold text-blue-600">properties (default):</span>
									<pre class="mt-1 whitespace-pre-wrap">{JSON.stringify(
											$popupOptions.properties,
											null,
											2
										)}</pre>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Style Options -->
				{#if $popupOptions.styleOptions}
					<div>
						<p class="mb-1 text-sm font-medium text-gray-700">Style Options:</p>
						<div class="rounded bg-gray-50 p-2 font-mono text-xs">
							<pre class="whitespace-pre-wrap">{JSON.stringify(
									$popupOptions.styleOptions,
									null,
									2
								)}</pre>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Reset button -->
		<button
			class="w-full rounded bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
			onclick={() => {
				propertyMode = 'all';
				callbackEvents = [];
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
				layers = [
					{ name: 'road-stations', displayName: 'Road Stations', enabled: true },
					{ name: 'railways', displayName: 'Railways', enabled: true },
					{ name: 'lakes', displayName: 'Lakes', enabled: true },
					{ name: 'contents', displayName: 'Contents', enabled: true }
				];
				popupOptions.set({
					enableHover: true,
					properties: undefined,
					excludeDataSources: [],
					onEntityClick: handleEntityClick,
					onEntityHover: handleEntityHover,
					onEmptyClick: handleEmptyClick,
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
