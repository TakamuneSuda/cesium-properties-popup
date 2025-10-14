# Cesium Properties Popup

[![npm version](https://img.shields.io/npm/v/cesium-properties-popup.svg)](https://www.npmjs.com/package/cesium-properties-popup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern Svelte 5 component library for displaying entity properties on hover or click in CesiumJS. Supports entity types: Points, Polygons, Lines (Polylines)

demo site: [https://d2hgd9m8me42il.cloudfront.net/](https://d2hgd9m8me42il.cloudfront.net/)

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Supported Entity Types](#supported-entity-types)
- [Layer Control](#layer-control)
- [Property Selection and Display Types](#property-selection-and-display-types)
- [Customization Options](#customization-options)
- [Styling](#styling)
- [Component Architecture](#component-architecture)
- [Type Definitions](#type-definitions)
- [Advanced Usage](#advanced-usage)
- [Utility Functions](#utility-functions)
- [Implementation Guidelines](#implementation-guidelines)
- [License](#license)

## Installation

```bash
# npm
npm install cesium-properties-popup

# pnpm
pnpm add cesium-properties-popup

# yarn
yarn add cesium-properties-popup
```

This library has peer dependencies on `cesium` and `svelte`:

```bash
# Required peer dependencies
npm install cesium svelte
```

## Basic Usage

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { EntityPopup } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	// Cesium module is dynamically imported, so use import type
	let cesium: typeof CesiumType | undefined = $state();
	let viewer: CesiumType.Viewer | undefined = $state();
	let viewerReady = $state(false);

	onMount(async (): Promise<void> => {
		if (!browser) return;

		try {
			// Import Cesium module only in browser
			cesium = (await import('cesium')) as typeof CesiumType;
			await import('cesium/Build/Cesium/Widgets/widgets.css');

			// Get necessary exports from Cesium module
			const { Ion, Viewer: CesiumViewer, Cartesian3 } = cesium;

			// Set access token
			Ion.defaultAccessToken = 'your_cesium_ion_access_token';

			// Initialize Viewer
			viewer = new CesiumViewer('cesiumContainer');

			// Set initial camera position
			viewer.camera.setView({
				destination: Cartesian3.fromDegrees(139.754409, 35.670355, 5000)
			});

			// Indicate that viewer is ready
			viewerReady = true;
		} catch (error) {
			console.error('Failed to initialize Cesium:', error);
		}
	});
</script>

<!-- Container for rendering Cesium -->
<div id="cesiumContainer" class="h-full w-full"></div>

<!-- Display EntityPopup when viewer is ready -->
{#if viewerReady && viewer && cesium}
	<EntityPopup {viewer} {cesium} />
{/if}
```

The EntityPopup component automatically displays properties of Cesium entities when users hover over them or click on them in the scene.

## Supported Entity Types

This library supports various Cesium entity types:

- ✅ **Points**
- ✅ **Lines (Polylines)**
- ✅ **Polygons**

## Layer Control

### DataSource-based Popup Control

You can control popup display on a per-DataSource (layer) basis. This allows you to show popups only for specific layers or exclude certain layers.

#### Show Only Specific Layers (Whitelist)

```javascript
const popup = new EntityPopup({
	target: document.body,
	props: {
		viewer,
		cesium,
		options: {
			// Show popups only for specified DataSource entities
			includeDataSources: ['road-stations', 'railways', 'contents']
		}
	}
});
```

#### Exclude Specific Layers (Blacklist)

```javascript
const popup = new EntityPopup({
	target: document.body,
	props: {
		viewer,
		cesium,
		options: {
			// Hide popups for specified DataSource entities
			excludeDataSources: ['lakes', 'background']
		}
	}
});
```

### Practical Example: Organizing Layers

```javascript
// Create DataSources with names matching demo layers
const roadStationsDataSource = new Cesium.CustomDataSource('road-stations');
const railwaysDataSource = new Cesium.CustomDataSource('railways');
const lakesDataSource = new Cesium.CustomDataSource('lakes');
const contentsDataSource = new Cesium.CustomDataSource('contents');

viewer.dataSources.add(roadStationsDataSource);
viewer.dataSources.add(railwaysDataSource);
viewer.dataSources.add(lakesDataSource);
viewer.dataSources.add(contentsDataSource);

// Add road station entities (points)
roadStationsDataSource.entities.add({
	position: Cesium.Cartesian3.fromDegrees(139.7, 35.6),
	point: {
		pixelSize: 10,
		color: Cesium.Color.RED,
		heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
	},
	properties: {
		P35_006: 'Tokyo Station',
		P35_003: 'Tokyo',
		P35_004: 'Chiyoda'
	}
});

// Add railway entities (polylines)
railwaysDataSource.entities.add({
	polyline: {
		positions: Cesium.Cartesian3.fromDegreesArray([139.7, 35.6, 139.8, 35.7]),
		width: 3,
		material: Cesium.Color.YELLOW,
		clampToGround: true
	},
	properties: {
		N02_003: 'Yamanote Line',
		N02_004: 'JR East'
	}
});

// Configure popup to exclude lakes layer
const popupOptions = {
	excludeDataSources: ['lakes']
};
```

### Dynamic Layer Control

```javascript
// Initialize with all layers enabled
let popupOptions = {
	excludeDataSources: []
};

// Function to toggle layer popup display
function toggleLayerPopup(dataSourceName, enabled) {
	if (enabled) {
		// Remove from exclusion list (enable popups)
		const index = popupOptions.excludeDataSources.indexOf(dataSourceName);
		if (index > -1) {
			popupOptions.excludeDataSources.splice(index, 1);
		}
	} else {
		// Add to exclusion list (disable popups)
		if (!popupOptions.excludeDataSources.includes(dataSourceName)) {
			popupOptions.excludeDataSources.push(dataSourceName);
		}
	}

	// Update popup options
	popup.$set({ options: popupOptions });
}

// Example usage with UI checkboxes
toggleLayerPopup('road-stations', false); // Disable road stations popups
toggleLayerPopup('railways', true); // Enable railways popups
toggleLayerPopup('lakes', false); // Disable lakes popups
toggleLayerPopup('contents', true); // Enable contents popups
```

### Priority Rules

When using both settings:

1. **`includeDataSources`** (whitelist) - If specified, only DataSources included will show popups
2. **`excludeDataSources`** (blacklist) - Applied when includeDataSources is not specified

### Important Notes

- DataSource `name` property is used for identification, so always set names when creating DataSources
- Entities not belonging to any DataSource (directly under `viewer.entities`) will show popups by default
- DataSources without names cannot be controlled

### Using Regular Expression Patterns

You can use regular expressions for flexible DataSource filtering:

#### RegExp Pattern Examples

```javascript
const popup = new EntityPopup({
	target: document.body,
	props: {
		viewer,
		cesium,
		options: {
			// Mix of exact match and regex patterns
			includeDataSources: [
				'exact-layer-name', // Exact match
				/^road-.*/, // Starts with "road-"
				/.*-stations$/, // Ends with "-stations"
				/railway|railroad/ // Contains "railway" OR "railroad"
			]
		}
	}
});
```

#### Practical Regex Examples

```javascript
// Show popups only for layers starting with "data-"
const popupOptions = {
	includeDataSources: [/^data-/]
};

// Exclude all temporary or test layers
const popupOptions = {
	excludeDataSources: [
		/^temp-/, // Starts with "temp-"
		/^test-/, // Starts with "test-"
		/-draft$/ // Ends with "-draft"
	]
};

// Complex pattern: show only specific prefixes
const popupOptions = {
	includeDataSources: [
		/^(road|rail|building)-/ // Starts with "road-", "rail-", or "building-"
	]
};
```

#### Pattern Matching Rules

1. **String patterns** perform exact matching

   ```javascript
   'layer-name'; // Matches only "layer-name" exactly
   ```

2. **RegExp patterns** use JavaScript regular expressions

   ```javascript
   /^prefix-/    // Matches any name starting with "prefix-"
   /.*-suffix$/  // Matches any name ending with "-suffix"
   /pattern/i    // Case-insensitive matching
   ```

3. **Mixed patterns** can be used together
   ```javascript
   includeDataSources: ['exact-name', /^pattern-.*$/, /.*-other$/];
   ```

#### TypeScript Usage with Patterns

```typescript
import { EntityPopup } from 'cesium-properties-popup';
import type { DataSourcePattern } from 'cesium-properties-popup';

// Type-safe pattern definition
const includePatterns: DataSourcePattern[] = ['exact-layer', /^prefix-.*/, /.*-suffix$/];

const popupOptions = {
	includeDataSources: includePatterns
};
```

## Property Selection and Display Types

### Property Selection with Whitelist Mode

You can control which properties are displayed in the popup and in what order by using the `properties` option:

```svelte
<script lang="ts">
	import { EntityPopup } from 'cesium-properties-popup';
	import type { PropertyConfig } from 'cesium-properties-popup';

	// Simple string array - displays properties in the order specified
	const simpleWhitelist = ['name', 'description', 'value'];

	// Advanced configuration with display names and types
	const advancedWhitelist: PropertyConfig[] = [
		// Simple text property with custom display name
		{ name: 'name', displayName: 'Name' },

		// Hyperlink display
		{
			name: 'website',
			displayName: 'Website',
			displayType: 'link'
		},

		// Image display
		{
			name: 'imageUrl',
			displayName: 'Preview',
			displayType: 'image'
		},

		// Email link
		{
			name: 'contact',
			displayName: 'Email',
			displayType: 'email'
		}
	];

	const popupOptions = {
		properties: advancedWhitelist
	};
</script>

{#if viewerReady && viewer && cesium}
	<EntityPopup {viewer} {cesium} options={popupOptions} />
{/if}
```

### Display Types

The library supports several display types for properties:

| Display Type | Description          | Example                     |
| ------------ | -------------------- | --------------------------- |
| `text`       | Default text display | Plain property value        |
| `link`       | Clickable hyperlink  | Opens in new tab/window     |
| `image`      | Image display        | Shows image with 100% width |
| `email`      | Email link           | Creates mailto: link        |

### Example with Mixed Display Types

```typescript
const propertyConfig: PropertyConfig[] = [
	// Regular text property
	{ name: 'stationName', displayName: 'Station' },

	// Hyperlink that opens in new tab
	{
		name: 'homepageUrl',
		displayName: 'Homepage',
		displayType: 'link'
	},

	// Image that displays at full width
	{
		name: 'photoUrl',
		displayName: 'Photo',
		displayType: 'image'
	},

	// Email address with mailto link
	{
		name: 'contactEmail',
		displayName: 'Contact',
		displayType: 'email'
	}
];
```

## Development Setup

If you encounter cache-related issues during development or debugging, you can clear the cache and rebuild using the following commands:

```bash
# Clear cache & rebuild
npm run rebuild

# Or execute individually
npm run clean   # Clear .svelte-kit and node_modules/.vite caches
npm run build   # Rebuild the library
```

## Customization Options

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { EntityPopup } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	let cesium: typeof CesiumType | undefined = $state();
	let viewer: CesiumType.Viewer | undefined = $state();
	let viewerReady = $state(false);

	// Popup options with custom settings
	const popupOptions = {
		// Enable/disable hover behavior (default: true)
		enableHover: true,

		// Property selection and configuration
		properties: [
			{ name: 'name', displayName: 'Name' },
			{ name: 'type', displayName: 'Type' },
			{ name: 'value', displayName: 'Value' }
		],

		// Style options
		styleOptions: {
			width: 400,
			height: 300,
			popupClass: 'my-custom-popup',
			backgroundColor: '#ffffff',
			overflowY: 'auto'
		}
	};

	onMount(async (): Promise<void> => {
		if (!browser) return;
		// Cesium initialization code (see Basic Usage example)
		// ...
	});
</script>

<!-- Container for rendering Cesium -->
<div id="cesiumContainer" class="h-full w-full"></div>

<!-- EntityPopup with custom options -->
{#if viewerReady && viewer && cesium}
	<EntityPopup {viewer} {cesium} options={popupOptions} />
{/if}
```

### Options API

| Option               | Type                         | Default     | Description                                                          |
| -------------------- | ---------------------------- | ----------- | -------------------------------------------------------------------- |
| `enableHover`        | boolean                      | `true`      | Enable popup display on hover                                        |
| `properties`         | PropertyConfig[] \| string[] | `undefined` | Whitelist of properties to display with optional configuration       |
| `excludeDataSources` | DataSourcePattern[]          | `undefined` | DataSource patterns to exclude from popup display (string or RegExp) |
| `includeDataSources` | DataSourcePattern[]          | `undefined` | DataSource patterns to include for popup display (whitelist)         |
| `styleOptions`       | object                       | `{}`        | Style configuration for the popup                                    |

#### Style Options

| Option            | Type   | Description                            |
| ----------------- | ------ | -------------------------------------- |
| `width`           | number | Popup width in pixels                  |
| `height`          | number | Popup height in pixels                 |
| `popupClass`      | string | CSS class to apply to popup            |
| `backgroundColor` | string | Background color (CSS value)           |
| `overflowY`       | string | Vertical overflow behavior (CSS value) |

````

## Styling

You can customize the appearance of the popup using CSS:

```html
<style>
	:global(.my-custom-popup) {
		border-radius: 8px;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
		border-left-color: #ff6347 !important;
	}

	:global(.my-custom-popup h3) {
		color: #2c3e50;
		font-weight: bold;
	}

	:global(.my-custom-popup table) {
		border-collapse: separate;
		border-spacing: 0 2px;
	}
</style>
````

## Component Architecture

This library consists of these main components:

- `EntityPopup`: The main component that manages entity popups on a Cesium viewer.
- `PopupPositioner`: A component that calculates and updates popup positions, automatically adjusting based on camera movements and entity position changes.
- `PopupContent`: A component that displays the popup content, showing entity names, descriptions, and properties.
- `PropertyValue`: A component that renders property values according to their display type.

### Entity Position Strategy System

The library uses a **Strategy Pattern** to handle different entity types:

- `PointStrategy`: Uses direct position for point entities
- `PolylineStrategy`: Calculates midpoint for line entities
- `PolygonStrategy`: Calculates center point using bounding sphere for polygon entities

## Type Definitions

```typescript
/**
 * Property display types
 */
export type PropertyDisplayType =
	| 'text' // Regular text (default)
	| 'link' // Hyperlink
	| 'image' // Image
	| 'email'; // Email address

/**
 * DataSource pattern type
 */
export type DataSourcePattern = string | RegExp;

/**
 * Property configuration
 */
export interface PropertyConfig {
	/** Property name */
	name: string;
	/** Display name (optional) */
	displayName?: string;
	/** Display type */
	displayType?: PropertyDisplayType;
}

/**
 * EntityPopup component options
 */
export interface EntityPopupOptions {
	/** Whether to show popup on hover */
	enableHover?: boolean;
	/** Properties whitelist configuration */
	properties?: PropertyConfig[] | string[];
	/** DataSource patterns to exclude from popup display (string for exact match, RegExp for pattern matching) */
	excludeDataSources?: DataSourcePattern[];
	/** DataSource patterns to include for popup display (whitelist) */
	includeDataSources?: DataSourcePattern[];
	/** Popup CSS settings */
	styleOptions?: {
		/** Popup width in pixels */
		width?: number;
		/** Popup height in pixels */
		height?: number;
		/** CSS class for the popup */
		popupClass?: string;
		/** Background color (CSS value) */
		backgroundColor?: string;
		/** Vertical overflow behavior (CSS value) */
		overflowY?: string;
	};
}
```

## Advanced Usage

You can use individual components as needed for more custom implementations:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { PopupPositioner, PopupContent } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	let cesium: typeof CesiumType | undefined = $state();
	let viewer: CesiumType.Viewer | undefined = $state();
	let selectedEntity: CesiumType.Entity | undefined = $state();
	let isPopupOpen = $state(false);

	onMount(async (): Promise<void> => {
		if (!browser) return;

		try {
			// Import Cesium module
			cesium = (await import('cesium')) as typeof CesiumType;
			await import('cesium/Build/Cesium/Widgets/widgets.css');

			const { Viewer: CesiumViewer, ScreenSpaceEventHandler, ScreenSpaceEventType } = cesium;

			// Initialize viewer
			viewer = new CesiumViewer('cesiumContainer');

			// Custom event handler setup
			const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
			handler.setInputAction((click) => {
				const pickedObject = viewer.scene.pick(click.position);
				if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
					handleEntitySelect(pickedObject.id);
				}
			}, ScreenSpaceEventType.LEFT_CLICK);
		} catch (error) {
			console.error('Failed to initialize Cesium:', error);
		}
	});

	// Custom entity selection logic
	function handleEntitySelect(entity: CesiumType.Entity) {
		selectedEntity = entity;
		isPopupOpen = true;
	}
</script>

<div id="cesiumContainer" class="h-full w-full"></div>

{#if isPopupOpen && selectedEntity && viewer && cesium}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<div class="custom-popup">
			<PopupContent entity={selectedEntity} {cesium} />
			<div class="actions">
				<button onclick={() => (isPopupOpen = false)}>Close</button>
			</div>
		</div>
	</PopupPositioner>
{/if}
```

## Utility Functions

You can directly use the utility functions provided by the library:

```typescript
import {
	formatPropertyValue,
	getPropertyEntries,
	getEntityPosition,
	worldPositionToScreenPosition,
	calculatePopupPosition,
	defaultSettings
} from 'cesium-properties-popup';

// Format entity property value
const formattedValue = formatPropertyValue(entity.properties.myProperty, cesium);

// Get property entries from an entity for display
const propertyEntries = getPropertyEntries(entity);

// Get entity's 3D position
const position = getEntityPosition(entity, cesium);

// Convert 3D coordinates to screen coordinates
const screenPosition = worldPositionToScreenPosition(position, viewer, cesium);

// Comprehensive function to calculate popup position
const popupPosition = await calculatePopupPosition(entity, viewer, cesium, currentPosition);

// Change default settings (for performance tuning, etc.)
defaultSettings.updateFrequency.cameraChangeThrottle = 150; // Change camera change throttling interval to 150ms
```

## Implementation Guidelines and Best Practices

### Working with GeoJSON Data

When loading GeoJSON data with custom properties:

```typescript
// Load GeoJSON with custom properties
const dataSource = await Cesium.GeoJsonDataSource.load('/data/locations.geojson');
viewer.dataSources.add(dataSource);

// Configure popup to display specific properties
const popupOptions = {
	properties: [
		{ name: 'name', displayName: 'Location Name' },
		{ name: 'website', displayName: 'Website', displayType: 'link' },
		{ name: 'photo', displayName: 'Photo', displayType: 'image' },
		{ name: 'email', displayName: 'Contact', displayType: 'email' }
	]
};
```

### Performance Optimization

1. **When dealing with many entities**

   ```typescript
   // Use property whitelist to limit displayed properties
   const popupOptions = {
   	properties: ['name', 'type', 'value', 'category']
   };
   ```

2. **For entities with complex properties**

   ```typescript
   // Display only essential properties
   const popupOptions = {
   	properties: [
   		{ name: 'id', displayName: 'ID' },
   		{ name: 'status', displayName: 'Status' },
   		{ name: 'lastUpdated', displayName: 'Last Updated' }
   	]
   };
   ```

### Visual Customization

1. **Theme-specific styling**

   ```svelte
   <script lang="ts">
   	import { onMount } from 'svelte';
   	import { browser } from '$app/environment';
   	import { EntityPopup } from 'cesium-properties-popup';
   	import type * as CesiumType from 'cesium';

   	let cesium: typeof CesiumType | undefined = $state();
   	let viewer: CesiumType.Viewer | undefined = $state();
   	let viewerReady = $state(false);

   	const popupOptions = {
   		styleOptions: {
   			popupClass: 'brand-theme'
   		}
   	};

   	onMount(async (): Promise<void> => {
   		// Cesium initialization (see Basic Usage example)
   		// ...
   	});
   </script>

   {#if viewerReady && viewer && cesium}
   	<EntityPopup {viewer} {cesium} options={popupOptions} />
   {/if}

   <style>
   	:global(.brand-theme) {
   		border-left: 4px solid #3498db;
   		border-radius: 0;
   		font-family: 'Roboto', sans-serif;
   	}

   	:global(.brand-theme h3) {
   		background-color: #f5f5f5;
   		padding: 12px;
   		margin: 0;
   	}
   </style>
   ```

2. **Situational style changes**

   ```svelte
   <script lang="ts">
   	import { onMount } from 'svelte';
   	import { browser } from '$app/environment';
   	import { EntityPopup } from 'cesium-properties-popup';
   	import type * as CesiumType from 'cesium';

   	let cesium: typeof CesiumType | undefined = $state();
   	let viewer: CesiumType.Viewer | undefined = $state();
   	let viewerReady = $state(false);
   	let theme = $state('light');

   	function toggleTheme() {
   		theme = theme === 'light' ? 'dark' : 'light';
   	}

   	// Reactive popup options based on theme
   	const popupOptions = $derived({
   		styleOptions: {
   			popupClass: theme === 'light' ? 'light-theme' : 'dark-theme'
   		}
   	});

   	onMount(async (): Promise<void> => {
   		// Cesium initialization (see Basic Usage example)
   		// ...
   	});
   </script>

   <button onclick={toggleTheme}>Toggle Theme</button>

   {#if viewerReady && viewer && cesium}
   	<EntityPopup {viewer} {cesium} options={popupOptions} />
   {/if}

   <style>
   	:global(.light-theme) {
   		background: white;
   		color: #333;
   	}

   	:global(.dark-theme) {
   		background: #333;
   		color: white;
   	}
   </style>
   ```

### Use-case Specific Tips

1. **Real estate data display**

   ```typescript
   const popupOptions = {
   	properties: [
   		{ name: 'address', displayName: 'Address' },
   		{ name: 'price', displayName: 'Price' },
   		{ name: 'area', displayName: 'Area (m²)' },
   		{ name: 'listingUrl', displayName: 'View Listing', displayType: 'link' },
   		{ name: 'photoUrl', displayName: 'Photo', displayType: 'image' }
   	]
   };
   ```

2. **Infrastructure monitoring**

   ```typescript
   const popupOptions = {
   	properties: [
   		{ name: 'stationId', displayName: 'Station ID' },
   		{ name: 'status', displayName: 'Status' },
   		{ name: 'lastInspection', displayName: 'Last Inspection' },
   		{ name: 'manualUrl', displayName: 'Manual', displayType: 'link' },
   		{ name: 'supportEmail', displayName: 'Support', displayType: 'email' }
   	]
   };
   ```

3. **Adding data attributions**

   ```svelte
   <script lang="ts">
   	import { onMount } from 'svelte';
   	import type * as CesiumType from 'cesium';

   	let cesium: typeof CesiumType | undefined = $state();
   	let viewer: CesiumType.Viewer | undefined = $state();

   	function addDataAttributions(): void {
   		if (!viewer || !cesium) return;

   		const { Credit } = cesium;

   		const credits = [
   			{
   				text: '<a href="https://example.com/data-source" target="_blank">Data Source Name</a>',
   				showOnScreen: true
   			}
   		];

   		credits.forEach((credit) => {
   			viewer.creditDisplay.addStaticCredit(new Credit(credit.text, credit.showOnScreen));
   		});
   	}

   	onMount(async (): Promise<void> => {
   		// After viewer initialization
   		addDataAttributions();
   	});
   </script>
   ```

## License

MIT
