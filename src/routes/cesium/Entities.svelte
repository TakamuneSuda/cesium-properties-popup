<script lang="ts">
	import type * as CesiumType from 'cesium';

	interface Props {
		// Receive Viewer and cesium module from parent component
		viewer: CesiumType.Viewer | undefined;
		cesium: typeof CesiumType | undefined;
	}

	let { viewer, cesium }: Props = $props();

	// Function to add data attributions
	function addDataAttributions(): void {
		if (!viewer || !cesium) return;

		const { Credit } = cesium;

		const credits = [
			{
				text: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P35.html" target="_blank">国土数値情報（道の駅データ）（国土交通省）</a>を加工して作成',
				showOnScreen: true
			},
			{
				text: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2023.html" target="_blank">国土数値情報（鉄道データ）（国土交通省）</a>を加工して作成',
				showOnScreen: true
			},
			{
				text: '<a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html" target="_blank">国土数値情報（湖沼データ）（国土交通省）</a>を加工して作成',
				showOnScreen: true
			}
		];

		// Add all credits to the viewer
		credits.forEach((credit) => {
			viewer.creditDisplay.addStaticCredit(new Credit(credit.text, credit.showOnScreen));
		});
	}

	// Function to add multiple entities
	async function addEntities(): Promise<void> {
		if (!viewer || !cesium) {
			console.error('viewer or cesium is not configured');
			return;
		}

		try {
			const { Color, GeoJsonDataSource } = cesium;

			// Add data attributions first
			addDataAttributions();

			// Load point data and add as entities
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

			// Load line (route) data
			const linesDataSource = await GeoJsonDataSource.load('/sample/lines.geojson');
			linesDataSource.entities.values.forEach((entity) => {
				viewer.entities.add({
					id: entity.id,
					name: entity.name,
					polyline: {
						positions: entity.polyline?.positions,
						width: 3,
						material: new cesium.ColorMaterialProperty(Color.YELLOW),
						clampToGround: true,
						classificationType: cesium.ClassificationType.BOTH
					},
					properties: entity.properties
				});
			});

			// Load polygon data
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
						heightReference: cesium.HeightReference.CLAMP_TO_GROUND
					},
					properties: entity.properties
				});
			});
		} catch (error) {
			console.error('Failed to add entities:', error);
		}
	}

	// Add entities when viewer and cesium are configured
	$effect(() => {
		if (viewer && cesium) {
			addEntities();
		}
	});
</script>
