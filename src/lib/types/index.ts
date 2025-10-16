/**
 * Cesium Properties Popup 型定義
 */
import type * as Cesium from 'cesium';

/**
 * プロパティの表示タイプ
 */
export type PropertyDisplayType =
	| 'text' // 通常のテキスト（デフォルト）
	| 'link' // ハイパーリンク
	| 'image' // 画像
	| 'email'; // メールアドレス

/**
 * DataSourceフィルタリングのパターン型
 * 文字列（完全一致）または正規表現パターンを指定可能
 */
export type DataSourcePattern = string | RegExp;

/**
 * エンティティイベントコールバックのコンテキスト情報
 */
export interface EntityEventContext {
	/** イベントが発生したエンティティ */
	entity: Cesium.Entity;

	/** クリック/ホバー時のマウス位置（ピクセル座標） */
	position: {
		x: number;
		y: number;
	};

	/** イベントタイプ */
	eventType: 'click' | 'hover';

	/** DataSource名（存在する場合） */
	dataSourceName?: string;
}

/**
 * プロパティ設定の型定義
 */
export interface PropertyConfig {
	/** プロパティ名 */
	name: string;

	/** 表示名（オプション） */
	displayName?: string;

	/** 表示タイプ */
	displayType?: PropertyDisplayType;
}

/**
 * 静的テキストコンテンツの設定
 * プロパティリストの中に固定テキストを挿入できる
 */
export interface StaticTextContent {
	/** コンテンツタイプ識別子 */
	type: 'static';

	/** 表示するラベル（左側に表示） */
	label: string;

	/** 表示する値（右側に表示） */
	value: string;

	/** オプション: 値の表示タイプ（text, link, image, email） */
	displayType?: PropertyDisplayType;
}

/**
 * プロパティアイテムの型
 * PropertyConfig（動的プロパティ）、string（プロパティ名）、StaticTextContent（静的テキスト）のいずれか
 */
export type PropertyItem = PropertyConfig | string | StaticTextContent;

/**
 * レイヤー（DataSource）ごとのプロパティ設定
 */
export interface LayerPropertyConfig {
	/**
	 * 対象レイヤーのパターン（DataSource名）
	 * 文字列の場合は完全一致、RegExpの場合は正規表現マッチング
	 */
	layerPattern: DataSourcePattern;

	/**
	 * このレイヤーで表示するプロパティのリスト
	 * PropertyConfig（動的プロパティ）、string（プロパティ名）、StaticTextContent（静的テキスト）を含められる
	 */
	properties: PropertyItem[];
}

/**
 * EntityPopupコンポーネントのオプション
 */
export interface EntityPopupOptions {
	/** ホバーでポップアップを表示するかどうか (デフォルト: true) */
	enableHover?: boolean;

	/** 表示するプロパティのホワイトリスト */
	properties?: PropertyConfig[] | string[];

	/**
	 * ポップアップを表示しないDataSource（レイヤー）の名前パターンリスト
	 * 文字列の場合は完全一致、RegExpの場合は正規表現マッチング
	 * DataSource.nameで判定
	 *
	 * @example
	 * ```typescript
	 * excludeDataSources: [
	 *   'exact-name',        // 完全一致
	 *   /^temp-/,            // "temp-" で始まるもの
	 *   /.*-draft$/          // "-draft" で終わるもの
	 * ]
	 * ```
	 */
	excludeDataSources?: DataSourcePattern[];

	/**
	 * ポップアップを表示するDataSource（レイヤー）の名前パターンリスト（ホワイトリスト）
	 * 文字列の場合は完全一致、RegExpの場合は正規表現マッチング
	 * 指定した場合、これらのパターンにマッチするDataSourceのエンティティのみポップアップを表示
	 *
	 * @example
	 * ```typescript
	 * includeDataSources: [
	 *   'layer1',            // 完全一致
	 *   /^data-.*$/          // "data-" で始まるもの
	 * ]
	 * ```
	 */
	includeDataSources?: DataSourcePattern[];

	/**
	 * レイヤー（DataSource）ごとのプロパティ設定
	 * 各レイヤーパターンに対して個別のプロパティリストを設定可能
	 *
	 * 優先順位:
	 * 1. layerPropertyConfigs でマッチした設定
	 * 2. properties（デフォルト設定）
	 * 3. すべてのプロパティを表示
	 *
	 * @example
	 * ```typescript
	 * layerPropertyConfigs: [
	 *   {
	 *     layerPattern: 'buildings',  // 完全一致
	 *     properties: [
	 *       { type: 'static', label: 'カテゴリ', value: '建物' },
	 *       'name',
	 *       { name: 'height', displayName: '高さ (m)' }
	 *     ]
	 *   },
	 *   {
	 *     layerPattern: /^sensor-.*$/,  // 正規表現
	 *     properties: [
	 *       { name: 'id', displayName: 'センサーID' },
	 *       { name: 'value', displayType: 'text' }
	 *     ]
	 *   }
	 * ]
	 * ```
	 */
	layerPropertyConfigs?: LayerPropertyConfig[];

	/** ポップアップのCSS設定 */
	styleOptions?: {
		/** ポップアップの幅（px） */
		width?: number;

		/** ポップアップの高さ（px） */
		height?: number;

		/** ポップアップのCSSクラス */
		popupClass?: string;

		/** ポップアップの背景色（CSS値） */
		backgroundColor?: string;

		/** ポップアップの縦方向のオーバーフロー（CSS値） */
		overflowY?: string;
	};

	/**
	 * ポップアップを自動表示するかどうか (デフォルト: true)
	 * false に設定すると、コールバックのみ実行されポップアップは表示されない
	 */
	showPopup?: boolean;

	/**
	 * エンティティがクリックされた時のコールバック
	 * コールバックは常に実行され、showPopup オプションとは独立
	 *
	 * @param context - イベントコンテキスト情報
	 */
	onEntityClick?: (context: EntityEventContext) => void | Promise<void>;

	/**
	 * エンティティにホバーした時のコールバック
	 * コールバックは常に実行され、showPopup オプションとは独立
	 *
	 * @param context - イベントコンテキスト情報
	 */
	onEntityHover?: (context: EntityEventContext) => void | Promise<void>;

	/**
	 * 空白（エンティティ以外）がクリックされた時のコールバック
	 *
	 * @param position - クリック位置
	 */
	onEmptyClick?: (position: { x: number; y: number }) => void | Promise<void>;
}

/**
 * 画面上の座標を表すインターフェース
 */
export interface ScreenPosition {
	x: number;
	y: number;
}

/**
 * インデックス付きプロパティバッグのインターフェース
 */
export interface PropertyBagWithIndex {
	[key: string]: unknown;
}

/**
 * ポップアップ位置計算のための設定インターフェース
 */
export interface PopupPositioningOptions {
	/** 画面のオフセット（ピクセル） */
	offset?: number;

	/** ポップアップの幅 */
	width?: number;

	/** ポップアップの高さ */
	height?: number;
}

/**
 * エンティティ位置取得戦略のインターフェース
 */
export interface EntityPositionStrategy {
	getPosition(entity: Cesium.Entity, scene: Cesium.Scene): Cesium.Cartesian3 | undefined;

	// オプショナルのメソッド
	updateTerrainHeight?: (entity: Cesium.Entity, scene: Cesium.Scene) => Promise<void>;
}

/**
 * PopupPositionerコンポーネントのProps
 */
export interface PopupPositionerProps {
	viewer: Cesium.Viewer | undefined;
	cesium: typeof Cesium | undefined;
	entity: Cesium.Entity | undefined;
	isPopupOpen: boolean;
	options?: EntityPopupOptions;
	children?: import('svelte').Snippet;
}

/**
 * EntityPopup コンポーネントの公開API
 * bind:this を使用して取得できるメソッド
 */
export interface EntityPopupAPI {
	/**
	 * ポップアップを閉じる
	 */
	close(): void;

	/**
	 * 指定したエンティティのポップアップを開く
	 * @param entity - 表示するエンティティ
	 */
	open(entity: Cesium.Entity): void;

	/**
	 * ポップアップが開いているか確認
	 * @returns ポップアップが開いている場合 true
	 */
	isOpen(): boolean;

	/**
	 * 現在選択されているエンティティを取得
	 * @returns 選択中のエンティティ、または undefined
	 */
	getSelectedEntity(): Cesium.Entity | undefined;
}

/**
 * EntityPopupコンポーネントのProps
 */
export interface EntityPopupProps {
	viewer: Cesium.Viewer | undefined;
	cesium: typeof Cesium | undefined;
	options?: EntityPopupOptions;
}

/**
 * PopupContentコンポーネントのProps
 */
export interface PopupContentProps {
	entity: Cesium.Entity | undefined;
	cesium: typeof Cesium | undefined;
	options?: EntityPopupOptions;
	customRenderer?: import('svelte').Snippet;
}
