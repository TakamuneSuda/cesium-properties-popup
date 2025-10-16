<script lang="ts">
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';
	import { getApplicablePropertyConfig } from '../utils/layerPropertyHelper';
	import type {
		PopupContentProps,
		PropertyConfig,
		PropertyItem,
		StaticTextContent
	} from '../types';
	import type * as CesiumType from 'cesium';
	import PropertyValue from './PropertyValue.svelte';

	// Add optional parameters from PopupContentProps
	let { entity, cesium, options = {} }: PopupContentProps = $props();

	// Type guard for StaticTextContent
	function isStaticContent(item: PropertyItem): item is StaticTextContent {
		return typeof item === 'object' && 'type' in item && item.type === 'static';
	}

	// Function to process properties based on configuration
	function processProperties(entity: CesiumType.Entity): Array<[string, unknown, PropertyConfig?]> {
		const allProperties = getPropertyEntries(entity);
		console.log('All Properties:', allProperties);

		// レイヤーに適用すべきプロパティ設定を取得
		const applicableProperties = getApplicablePropertyConfig(
			entity,
			options.layerPropertyConfigs,
			options.properties
		);

		// プロパティ設定がある場合（ホワイトリストモード）
		if (applicableProperties) {
			const propertyMap = new Map(allProperties);
			const processedProperties: Array<[string, unknown, PropertyConfig?]> = [];

			for (const prop of applicableProperties) {
				// 静的テキストの場合
				if (isStaticContent(prop)) {
					const config: PropertyConfig = {
						name: prop.label, // labelをnameとして使用
						displayType: prop.displayType
					};
					processedProperties.push([prop.label, prop.value, config]);
					continue;
				}

				// 動的プロパティの場合
				const config: PropertyConfig = typeof prop === 'string' ? { name: prop } : prop;

				const value = propertyMap.get(config.name);
				if (value !== undefined) {
					const displayName = config.displayName || config.name;
					processedProperties.push([displayName, value, config]);
				}
			}

			return processedProperties;
		}

		// デフォルト: すべてのプロパティを表示
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
