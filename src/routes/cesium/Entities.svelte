<script lang="ts">
	import type * as CesiumType from 'cesium';

	interface Props {
		// Viewerとcesiumモジュールを親コンポーネントから受け取る
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
	}

	let { viewer, cesium }: Props = $props();

	// 複数の地物を追加する関数
	function addEntities(): void {
		if (!viewer || !cesium) {
			console.error('viewer または cesium が設定されていません');
			return;
		}

		try {
			// Cesiumのクラスを取得
			const { Cartesian3, Color, VerticalOrigin, HorizontalOrigin, JulianDate } = cesium;

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
					website: 'https://www.tokyotower.co.jp/',
					isLandmark: true, // 真偽値プロパティの例
					visitorsPerYear: 4000000 // 数値プロパティの例
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
					website: 'https://www.tokyo-skytree.jp/',
					isLandmark: true,
					visitorsPerYear: 6000000,
					facilities: ['展望台', '商業施設', 'プラネタリウム', 'レストラン'], // 配列プロパティの例
					openingHours: {
						// オブジェクトプロパティの例
						weekdays: '8:00-22:00',
						weekends: '8:00-23:00',
						holidays: '8:00-23:00'
					}
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
					website: 'https://www.kunaicho.go.jp/event/kokyo-tours.html',
					isLandmark: true,
					accessibleAreas: ['皇居東御苑', '北の丸公園', '二重橋'],
					lastRenovation: JulianDate.fromDate(new Date(2015, 0, 1)) // JulianDate型の例
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
					website: 'https://www.tokyoinfo.com/',
					railwayLines: ['JR東日本', '東京メトロ', '都営地下鉄'],
					facilities: ['東京駅一番街', '東京ステーションホテル', 'グランスタ', 'KITTEビル'],
					renovationHistory: {
						original: '1914年12月20日',
						damaged: '1945年5月（第二次世界大戦）',
						restored: '2012年10月1日（創建当時の姿に復元）'
					}
				}
			});

			// 地物5: 新宿御苑（ポリゴン地物の例）
			viewer.entities.add({
				id: 'shinjuku-gyoen',
				name: '新宿御苑',
				polygon: {
					hierarchy: cesium.Cartesian3.fromDegreesArray([
						139.708,
						35.688, // 南西
						139.717,
						35.688, // 南東
						139.717,
						35.692, // 北東
						139.708,
						35.692 // 北西
					]),
					material: cesium.Color.GREEN.withAlpha(0.5),
					heightReference: cesium.HeightReference.CLAMP_TO_GROUND
				},
				position: Cartesian3.fromDegrees(139.7125, 35.69, 0),
				label: {
					text: '新宿御苑',
					font: '14pt sans-serif',
					style: cesium.LabelStyle.FILL_AND_OUTLINE,
					outlineWidth: 2,
					verticalOrigin: VerticalOrigin.CENTER,
					heightReference: cesium.HeightReference.RELATIVE_TO_GROUND
				},
				description: '東京都新宿区と渋谷区に跨る国民公園',
				properties: {
					address: '〒160-0014 東京都新宿区内藤町11',
					area: '58.3ヘクタール',
					established: '1906年（明治39年）',
					entranceFee: {
						adult: '500円',
						child: '無料',
						senior: '250円'
					},
					gardens: ['日本庭園', 'フランス式整形庭園', 'イギリス風景式庭園'],
					openingHours: '9:00-16:00（入園は15:30まで）',
					closedDays: '月曜日（祝日の場合は翌日）、年末年始',
					coordinates: {
						center: '35.6900° N, 139.7125° E',
						bounds: '約1.5km×1km'
					},
					lastUpdated: new Date(2022, 3, 1).toISOString() // ISO日付文字列の例
				}
			});

			console.log('5つのエンティティを追加しました');
		} catch (error) {
			console.error('エンティティの追加に失敗しました:', error);
		}
	}

	// viewerとcesiumが設定されたら地物を追加
	$effect(() => {
		if (viewer && cesium) {
			console.log('Entities: viewer と cesium が設定されました (using $effect)');
			addEntities();
			// この$effectはエンティティを追加するだけなので、通常クリーンアップは不要です。
			// エンティティはviewerインスタンスに属し、コンポーネントが破棄されてもviewerが存続する限り残ります。
			// もしこのコンポーネントが破棄される際にエンティティを削除する必要がある場合は、
			// return () => { /* remove entities logic */ }; のようにクリーンアップ関数を定義します。
		}
	});
</script>
