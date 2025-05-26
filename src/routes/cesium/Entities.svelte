<script lang="ts">
	import type * as CesiumType from 'cesium';

	// Viewerとcesiumモジュールを親コンポーネントから受け取る
	export let viewer: CesiumType.Viewer | undefined;
	export let cesium: typeof CesiumType | undefined;

	// 複数の地物を追加する関数
	function addEntities(): void {
		if (!viewer || !cesium) {
			console.error('viewer または cesium が設定されていません');
			return;
		}

		try {
			// Cesiumのクラスを取得
			const { Cartesian3, Color, VerticalOrigin, HorizontalOrigin } = cesium;

			// 地物1: 東京タワー
			viewer.entities.add({
				id: 'tokyo-tower',
				name: '東京タワー',
				position: Cartesian3.fromDegrees(139.7454, 35.6586, 10),
				point: {
					pixelSize: 12,
					color: Color.RED,
					outlineColor: Color.WHITE,
					outlineWidth: 2,
					heightReference: cesium.HeightReference.CLAMP_TO_GROUND
				},
				label: {
					text: '東京タワー',
					font: '14pt sans-serif',
					style: cesium.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 2,
					verticalOrigin: VerticalOrigin.BOTTOM,
					pixelOffset: new cesium.Cartesian2(0, -9),
					heightReference: cesium.HeightReference.RELATIVE_TO_GROUND
				},
				description: '東京都のシンボルとして1958年に建設された電波塔',
				properties: {
					address: '〒105-0011 東京都港区芝公園4-2-8',
					coordinates: '35.6586° N, 139.7454° E',
					height: '333m',
					opened: '1958年12月23日',
					website: 'https://www.tokyotower.co.jp/'
				}
			});

			// 地物2: 東京スカイツリー
			viewer.entities.add({
				id: 'tokyo-skytree',
				name: '東京スカイツリー',
				position: Cartesian3.fromDegrees(139.8107, 35.7101, 10),
				point: {
					pixelSize: 12,
					color: Color.BLUE,
					outlineColor: Color.WHITE,
					outlineWidth: 2,
					heightReference: cesium.HeightReference.CLAMP_TO_GROUND
				},
				label: {
					text: '東京スカイツリー',
					font: '14pt sans-serif',
					style: cesium.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 2,
					verticalOrigin: VerticalOrigin.BOTTOM,
					pixelOffset: new cesium.Cartesian2(0, -9),
					heightReference: cesium.HeightReference.RELATIVE_TO_GROUND
				},
				description: '2012年に完成した世界一高い自立式電波塔',
				properties: {
					address: '〒131-0045 東京都墨田区押上1-1-2',
					coordinates: '35.7101° N, 139.8107° E',
					height: '634m',
					opened: '2012年5月22日',
					website: 'https://www.tokyo-skytree.jp/'
				}
			});

			// 地物3: 皇居
			viewer.entities.add({
				id: 'imperial-palace',
				name: '皇居',
				position: Cartesian3.fromDegrees(139.7528, 35.6852, 10),
				point: {
					pixelSize: 12,
					color: Color.GREEN,
					outlineColor: Color.WHITE,
					outlineWidth: 2,
					heightReference: cesium.HeightReference.CLAMP_TO_GROUND
				},
				label: {
					text: '皇居',
					font: '14pt sans-serif',
					style: cesium.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 2,
					verticalOrigin: VerticalOrigin.BOTTOM,
					pixelOffset: new cesium.Cartesian2(0, -9),
					heightReference: cesium.HeightReference.RELATIVE_TO_GROUND
				},
				description: '天皇の居住地であり、江戸城跡地に位置する',
				properties: {
					address: '〒100-8111 東京都千代田区',
					coordinates: '35.6852° N, 139.7528° E',
					area: '約115ヘクタール',
					established: '1868年（明治元年）',
					website: 'https://www.kunaicho.go.jp/event/kokyo-tours.html'
				}
			});

			// 地物4: 東京駅
			viewer.entities.add({
				id: 'tokyo-station',
				name: '東京駅',
				position: Cartesian3.fromDegrees(139.7671, 35.6812, 10),
				billboard: {
					image:
						'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Map_marker.svg/40px-Map_marker.svg.png',
					verticalOrigin: VerticalOrigin.BOTTOM,
					horizontalOrigin: HorizontalOrigin.CENTER,
					scale: 1.0,
					heightReference: cesium.HeightReference.CLAMP_TO_GROUND
				},
				label: {
					text: '東京駅',
					font: '14pt sans-serif',
					style: cesium.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 2,
					verticalOrigin: VerticalOrigin.BOTTOM,
					pixelOffset: new cesium.Cartesian2(0, -45),
					heightReference: cesium.HeightReference.RELATIVE_TO_GROUND
				},
				description: '1914年に開業した日本の重要な鉄道ハブ駅',
				properties: {
					address: '〒100-0005 東京都千代田区丸の内1丁目9-1',
					coordinates: '35.6812° N, 139.7671° E',
					opened: '1914年12月20日',
					platforms: '28ホーム',
					dailyPassengers: '約50万人（コロナ前）',
					website: 'https://www.tokyoinfo.com/'
				}
			});

			console.log('4つのエンティティを追加しました');
		} catch (error) {
			console.error('エンティティの追加に失敗しました:', error);
		}
	}

	// viewerとcesiumが設定されたら地物を追加
	$: if (viewer && cesium) {
		console.log('Entities: viewer と cesium が設定されました');
		addEntities();
	}
</script>
