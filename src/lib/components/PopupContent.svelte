<script lang="ts">
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';
	import type { EntityPopupOptions, PopupContentProps } from '../types';

	// Add optional parameters from PopupContentProps
	let {
		entity,
		cesium,
		options = {}
	}: PopupContentProps & { options?: EntityPopupOptions } = $props();

	// Function to filter properties
	function filterProperty(name: string, value: unknown): boolean {
		if (options.filterProperties) {
			return options.filterProperties(name, value);
		}
		return true; // By default, show all properties
	}

	// Get properties to display from the entity and filter as needed
	let filteredProperties = $derived(
		entity ? getPropertyEntries(entity).filter(([key, value]) => filterProperty(key, value)) : []
	);
</script>

<div class="popup-content">
	<div class="properties">
		{#if filteredProperties.length > 0}
			<table class="property-table">
				<tbody>
					{#each filteredProperties as [key, value] (key)}
						<tr>
							<td class="property-key">{key}</td>
							<td class="property-value">{formatPropertyValue(value, cesium)}</td>
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

	.popup-pointer {
		position: absolute;
		bottom: -0.5rem;
		left: 50%;
		height: 0;
		width: 0;
		transform: translateX(-50%);
		border-top: 0.5rem solid rgba(255, 255, 255, 0.95);
		border-right: 0.5rem solid transparent;
		border-left: 0.5rem solid transparent;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05));
	}
</style>
