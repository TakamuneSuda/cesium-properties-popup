<script lang="ts">
	import type * as CesiumType from 'cesium';
	// ライブラリからコンポーネントをインポート
	import { EntityPopup as LibraryEntityPopup, type EntityPopupOptions } from '$lib';

	interface Props {
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
		enableHover?: boolean;
	}

	let { viewer, cesium, enableHover = true }: Props = $props();

	// ポップアップのオプションを設定
	const popupOptions: EntityPopupOptions = {
		enableHover,
		styleOptions: {
			width: 400,
			height: 300
		}
	};
</script>

<!-- ライブラリコンポーネントを使用 -->
<LibraryEntityPopup {viewer} {cesium} options={popupOptions} />
