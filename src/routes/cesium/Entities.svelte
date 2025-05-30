<script lang="ts">
	import type * as CesiumType from 'cesium';

	interface Props {
		// Viewerとcesiumモジュールを親コンポーネントから受け取る
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
	}

	let { viewer, cesium }: Props = $props();

	// 複数の地物を追加する関数
	async function addEntities(): Promise<void> {
		if (!viewer || !cesium) {
			console.error('viewer または cesium が設定されていません');
			return;
		}

		try {
			const { Color, GeoJsonDataSource } = cesium;

			// ポイントデータを読み込んでエンティティとして追加
			const pointsDataSource = await GeoJsonDataSource.load('/sample/points.geojson');
			pointsDataSource.entities.values.forEach((entity) => {
				const position = entity.position?.getValue(new cesium.JulianDate());
				if (position) {
					viewer.entities.add({
						id: entity.id,
						name: entity.name,
						position: position,
						point: {
							pixelSize: 10,
							color: Color.RED,
							outlineColor: Color.WHITE,
							outlineWidth: 2,
							heightReference: cesium.HeightReference.CLAMP_TO_GROUND
						},
						properties: entity.properties
					});
				}
			});

			// ライン（路線）データを読み込む
			const linesDataSource = await GeoJsonDataSource.load('/sample/lines.geojson');
			linesDataSource.entities.values.forEach((entity) => {
				viewer.entities.add({
					id: entity.id,
					name: entity.name,
					polyline: {
						positions: entity.polyline?.positions,
						width: 3,
						material: new cesium.ColorMaterialProperty(Color.YELLOW),
						clampToGround: false,
						classificationType: cesium.ClassificationType.BOTH
					},
					properties: entity.properties
				});
			});

			// ポリゴンデータを読み込む
			const polygonsDataSource = await GeoJsonDataSource.load('/sample/polygons.geojson');
			polygonsDataSource.entities.values.forEach((entity) => {
				viewer.entities.add({
					id: entity.id,
					name: entity.name,
					polygon: {
						hierarchy: entity.polygon?.hierarchy,
						material: Color.BLUE.withAlpha(0.5),
						outline: true,
						outlineColor: Color.WHITE,
						clampToGround: true
					},
					properties: entity.properties
				});
			});
		} catch (error) {
			console.error('エンティティの追加に失敗しました:', error);
		}
	}

	// viewerとcesiumが設定されたら地物を追加
	$effect(() => {
		if (viewer && cesium) {
			addEntities();
			// この$effectはエンティティを追加するだけなので、通常クリーンアップは不要です。
			// エンティティはviewerインスタンスに属し、コンポーネントが破棄されてもviewerが存続する限り残ります。
			// もしこのコンポーネントが破棄される際にエンティティを削除する必要がある場合は、
			// return () => { /* remove entities logic */ }; のようにクリーンアップ関数を定義します。
		}
	});
</script>
