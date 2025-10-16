import type { Entity, DataSource } from 'cesium';
import type { DataSourcePattern, LayerPropertyConfig, PropertyItem } from '../types';

/**
 * DataSource名がパターンにマッチするか判定
 * @param name - DataSource名
 * @param pattern - パターン（文字列または正規表現）
 * @returns マッチした場合true
 */
export function matchesPattern(name: string, pattern: DataSourcePattern): boolean {
	if (typeof pattern === 'string') {
		// 文字列の場合は完全一致
		return name === pattern;
	} else if (pattern instanceof RegExp) {
		// RegExpの場合は正規表現マッチング
		return pattern.test(name);
	}
	return false;
}

/**
 * エンティティのDataSource名を取得
 * @param entity - 対象エンティティ
 * @returns DataSource名（取得できない場合はundefined）
 */
export function getDataSourceName(entity: Entity): string | undefined {
	if (entity.entityCollection && entity.entityCollection.owner) {
		const owner = entity.entityCollection.owner;
		// DataSourceの場合のみnameプロパティを確認
		if ('name' in owner) {
			return (owner as DataSource).name;
		}
	}
	return undefined;
}

/**
 * エンティティに適用すべきプロパティ設定を取得
 *
 * @param entity - 対象エンティティ
 * @param layerConfigs - レイヤー別プロパティ設定のリスト
 * @param defaultProperties - デフォルトのプロパティ設定
 * @returns 適用すべきプロパティ設定（undefinedの場合は全プロパティを表示）
 */
export function getApplicablePropertyConfig(
	entity: Entity,
	layerConfigs?: LayerPropertyConfig[],
	defaultProperties?: PropertyItem[]
): PropertyItem[] | undefined {
	// レイヤー別設定がある場合
	if (layerConfigs && layerConfigs.length > 0) {
		const dataSourceName = getDataSourceName(entity);

		if (dataSourceName) {
			// マッチする最初のレイヤー設定を探す
			for (const config of layerConfigs) {
				if (matchesPattern(dataSourceName, config.layerPattern)) {
					return config.properties;
				}
			}
		}
	}

	// マッチするレイヤー設定がない場合はデフォルト設定を返す
	return defaultProperties;
}
