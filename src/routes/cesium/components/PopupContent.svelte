<script lang="ts">
	import type * as CesiumType from 'cesium';
	import { formatPropertyValue, getPropertyEntries } from '../utils/entityHelpers';

	export let entity: CesiumType.Entity | undefined;
	export let cesium: typeof CesiumType | undefined;
</script>

<div class="flex items-center justify-between border-b border-gray-300 bg-gray-100 p-2 px-3">
	<h3 class="m-0 text-base font-semibold">{entity?.name || 'Entity'}</h3>
</div>

<div class="p-3">
	{#if entity?.description}
		<p class="mt-0 mb-3 text-sm">{formatPropertyValue(entity.description, cesium)}</p>
	{/if}

	<div class="properties">
		<h4 class="mt-0 mb-2 text-sm font-semibold">プロパティ</h4>
		{#if entity && getPropertyEntries(entity).length > 0}
			<table class="w-full border-collapse">
				<tbody>
					{#each getPropertyEntries(entity) as [key, value] (key)}
						<tr>
							<td class="border-b border-gray-200 px-2 py-1 text-sm font-medium text-gray-600"
								>{key}</td
							>
							<td class="border-b border-gray-200 px-2 py-1 text-sm break-words"
								>{formatPropertyValue(value, cesium)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>プロパティがありません</p>
		{/if}
	</div>
</div>
<!-- ポップアップの視認性を高めるための接続線 -->
<div
	class="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-t-8 border-r-8 border-l-8 border-t-white/95 border-r-transparent border-l-transparent drop-shadow filter"
></div>
