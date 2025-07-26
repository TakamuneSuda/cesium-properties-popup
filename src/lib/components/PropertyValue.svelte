<script lang="ts">
	import type { PropertyConfig } from '../types';

	interface Props {
		value: unknown;
		config?: PropertyConfig;
	}

	let { value, config }: Props = $props();

	// デフォルト値の取得
	function getDefaultValue(val: unknown): string {
		if (val === null || val === undefined) return '';
		if (typeof val === 'object') {
			try {
				return JSON.stringify(val, null, 2);
			} catch {
				return String(val);
			}
		}
		return String(val);
	}

	// 表示タイプの取得
	const displayType = $derived(config?.displayType || 'text');
	const displayOptions = $derived(config?.displayOptions || {});
	const displayValue = $derived(getDefaultValue(value));
</script>

{#if displayType === 'text'}
	<span>{displayValue}</span>
{:else if displayType === 'link'}
	<a
		href={displayValue}
		target={displayOptions.linkTarget || '_blank'}
		rel="noopener noreferrer"
		class="text-blue-600 underline hover:text-blue-800"
	>
		{displayValue}
	</a>
{:else if displayType === 'image'}
	{#if displayOptions.imageFullWidth}
		<img src={displayValue} alt="" style="width: 100%; height: auto;" class="block" />
	{:else}
		<img
			src={displayValue}
			alt=""
			style={`max-width: ${displayOptions.imageMaxWidth || 200}px; max-height: ${displayOptions.imageMaxHeight || 150}px;`}
			class="block"
		/>
	{/if}
{:else if displayType === 'email'}
	<a href={`mailto:${displayValue}`} class="text-blue-600 underline hover:text-blue-800">
		{displayValue}
	</a>
{:else}
	<span>{displayValue}</span>
{/if}
