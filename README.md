# Cesium Properties Popup

[![npm version](https://img.shields.io/npm/v/cesium-properties-popup.svg)](https://www.npmjs.com/package/cesium-properties-popup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Svelte component library for displaying entity properties on hover or click in CesiumJS. Supports entity types including Points, Polygons, Lines (Polylines).

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Supported Entity Types](#supported-entity-types)
- [Customization Options](#customization-options)
- [Styling](#styling)
- [Component Architecture](#component-architecture)
- [Type Definitions](#type-definitions)
- [Advanced Usage](#advanced-usage)
- [Utility Functions](#utility-functions)
- [Implementation Guidelines](#implementation-guidelines)
- [Changelog](#changelog)

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
	import { EntityPopup } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	let viewer: CesiumType.Viewer;
	let cesium: typeof CesiumType;

	// Cesium viewer initialization (omitted)
</script>

<!-- Set up Cesium viewer -->
<div id="cesiumContainer" />

<!-- Simplest usage -->
<EntityPopup {viewer} {cesium} />
```

The EntityPopup component automatically displays properties of Cesium entities when users hover over them or click on them in the scene.

## Supported Entity Types

This library supports various Cesium entity types:

- ✅ **Points**
- ✅ **Polygons**
- ✅ **Lines (Polylines)**
- ✅ **Billboards**
- ✅ **3D Models**
- ✅ **Other entity types**

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
<EntityPopup
	{viewer}
	{cesium}
	options={{
		// Enable/disable hover behavior (default: true)
		enableHover: true,

		// Property filtering function
		filterProperties: (name, value) => !name.startsWith('_'),

		// Style options
		styleOptions: {
			width: 400,
			height: 300,
			popupClass: 'my-custom-popup',
			backgroundColor: '#ffffff',
			overflowY: 'auto'
		}
	}}
/>
```

### Options API

| Option             | Type     | Default     | Description                                       |
| ------------------ | -------- | ----------- | ------------------------------------------------- |
| `enableHover`      | boolean  | `true`      | Enable popup display on hover                     |
| `filterProperties` | function | `undefined` | Function to filter which properties are displayed |
| `styleOptions`     | object   | `{}`        | Style configuration for the popup                 |

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

### Entity Position Strategy System

The library uses a **Strategy Pattern** to handle different entity types:

- `PointStrategy`: Uses direct position for point entities
- `PolylineStrategy`: **[NEW]** Calculates midpoint for line entities
- `PolygonStrategy`: Calculates center point using bounding sphere for polygon entities

## Type Definitions

```typescript
interface EntityPopupOptions {
	/** Whether to show popup on hover */
	enableHover?: boolean;
	/** Function to filter properties */
	filterProperties?: (name: string, value: unknown) => boolean;
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
	import { PopupPositioner, PopupContent } from 'cesium-properties-popup';
	import type * as CesiumType from 'cesium';

	let viewer: CesiumType.Viewer;
	let cesium: typeof CesiumType;
	let selectedEntity: CesiumType.Entity | undefined;
	let isPopupOpen = false;

	// Custom entity selection logic
	function handleEntitySelect(entity) {
		selectedEntity = entity;
		isPopupOpen = true;
	}

	// Custom event handler setup
	const handler = new cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	handler.setInputAction((click) => {
		const pickedObject = viewer.scene.pick(click.position);
		if (cesium.defined(pickedObject) && pickedObject.id instanceof cesium.Entity) {
			handleEntitySelect(pickedObject.id);
		}
	}, cesium.ScreenSpaceEventType.LEFT_CLICK);
</script>

{#if isPopupOpen && selectedEntity}
	<PopupPositioner {viewer} {cesium} entity={selectedEntity} {isPopupOpen}>
		<div class="custom-popup">
			<PopupContent entity={selectedEntity} {cesium} />
			<div class="actions">
				<button on:click={() => (isPopupOpen = false)}>Close</button>
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

### Performance Optimization

1. **When dealing with many entities**

   ```typescript
   // Limit displayed properties using filtering
   const popupOptions = {
   	filterProperties: (name, value) => {
   		// Show only important properties
   		const importantProps = ['name', 'type', 'value', 'category'];
   		return importantProps.includes(name);
   	}
   };
   ```

2. **For entities with complex properties**

   ```typescript
   // Optimize display for entities with large JSON properties
   const popupOptions = {
   	filterProperties: (name, value) => {
   		// Exclude large objects or complex data structures
   		if (typeof value === 'object' && value !== null) {
   			if (name === 'attributes' || name === 'metadata') {
   				return false; // Exclude complex data
   			}
   		}
   		return true;
   	}
   };
   ```

### Visual Customization

1. **Theme-specific styling**

   ```svelte
   <EntityPopup
   	{viewer}
   	{cesium}
   	options={{
   		styleOptions: {
   			popupClass: 'brand-theme'
   		}
   	}}
   />

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
   	import { EntityPopup } from 'cesium-properties-popup';

   	let theme = 'light';

   	function toggleTheme() {
   		theme = theme === 'light' ? 'dark' : 'light';
   	}

   	$: popupOptions = {
   		styleOptions: {
   			popupClass: theme === 'light' ? 'light-theme' : 'dark-theme'
   		}
   	};
   </script>

   <button on:click={toggleTheme}>Toggle Theme</button>
   <EntityPopup {viewer} {cesium} options={popupOptions} />

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

   ```svelte
   <script>
   	const popupOptions = {
   		filterProperties: (name) => importantProperties.includes(name)
   	};
   </script>
   ```

2. **Time-series data display**

   ```svelte
   <script>
   	// For time-series data, focus on more relevant information with filtering
   	const popupOptions = {
   		filterProperties: (name) =>
   			['timestamp', 'observed_at', 'temperature', 'value'].includes(name)
   	};
   </script>
   ```

## License

MIT
