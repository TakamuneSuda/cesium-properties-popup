<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';
	import type { EntityPopupOptions } from '../types';

	interface Props {
		entity: CesiumType.Entity | undefined;
		cesium: typeof CesiumType | undefined;
		options?: EntityPopupOptions;
	}

	let { entity, cesium, options = {} }: Props = $props();

	// プロパティをフィルタリングするための関数
	function filterProperty(name: string, value: unknown): boolean {
		if (options.filterProperties) {
			return options.filterProperties(name, value);
		}
		return true; // デフォルトではすべてのプロパティを表示
	}

	// エンティティから表示対象のプロパティを取得して必要に応じてフィルタリング
	let filteredProperties = $derived(
		entity ? getPropertyEntries(entity).filter(([key, value]) => filterProperty(key, value)) : []
	);
</script>

<div class="p-2">
	<div>
		{#if filteredProperties.length > 0}
			<table class="w-full">
				<tbody>
					{#each filteredProperties as [key, value] (key)}
						<tr>
							<td class="px-1 py-1 text-sm">{key}</td>
							<td class="px-1 py-1 text-sm">{formatPropertyValue(value, cesium)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>プロパティなし</p>
		{/if}
	</div>
</div>
<!-- ポップアップの矢印 -->
<div
	class="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-t-8 border-r-8 border-l-8 border-t-white border-r-transparent border-l-transparent"
></div>
