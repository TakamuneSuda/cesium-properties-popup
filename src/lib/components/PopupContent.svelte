<script lang="ts">
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';
	import type { PopupContentProps, PropertyConfig } from '../types';
	import type * as CesiumType from 'cesium';
	import PropertyValue from './PropertyValue.svelte';

	// Add optional parameters from PopupContentProps
	let { entity, cesium, options = {} }: PopupContentProps = $props();

	// Function to process properties based on configuration
	function processProperties(entity: CesiumType.Entity): Array<[string, unknown, PropertyConfig?]> {
		const allProperties = getPropertyEntries(entity);

		// If properties option is specified (whitelist mode)
		if (options.properties) {
			const propertyList = options.properties;
			const propertyMap = new Map(allProperties);

			// Filter and map based on whitelist
			const processedProperties: Array<[string, unknown, PropertyConfig?]> = [];

			for (const prop of propertyList) {
				const config: PropertyConfig = typeof prop === 'string' ? { name: prop } : prop;

				const value = propertyMap.get(config.name);
				if (value !== undefined) {
					const displayName = config.displayName || config.name;
					processedProperties.push([displayName, value, config]);
				}
			}

			return processedProperties;
		}

		// Return all properties by default
		return allProperties.map(([key, value]) => [key, value, undefined]);
	}

	// Get properties to display from the entity
	let filteredProperties = $derived(entity ? processProperties(entity) : []);
</script>

<div class="popup-content">
	<div class="properties">
		{#if filteredProperties.length > 0}
			<table class="property-table">
				<tbody>
					{#each filteredProperties as [key, value, config] (key)}
						<tr>
							<td class="property-key">{key}</td>
							<td class="property-value">
								{#if config?.displayType}
									<PropertyValue {value} {config} />
								{:else}
									{formatPropertyValue(value, cesium)}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>No properties available</p>
		{/if}
	</div>
</div>

<style>
	.popup-content {
		padding: 0.75rem;
	}

	.property-table {
		width: 100%;
		border-collapse: collapse;
	}

	.property-key {
		border-bottom: 1px solid #e5e7eb;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #4b5563;
	}

	.property-value {
		border-bottom: 1px solid #e5e7eb;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		word-break: break-word;
	}
</style>
