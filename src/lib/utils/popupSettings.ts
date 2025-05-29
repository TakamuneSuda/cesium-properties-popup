/**
 * ポップアップの設定を一元管理するファイル
 * パラメータの調整やチューニングを容易にするために分離
 */
export const POPUP_SETTINGS = {
	// デフォルトのスタイル設定
	defaultStyles: {
		width: 400,
		height: 300,
		backgroundColor: 'rgba(255, 255, 255, 0.95)',
		overflowY: 'auto'
	},
	// 位置計算の設定
	positioning: {
		// スムージング係数 (0-1: 1に近いほど前回位置の影響が強くなる)
		smoothingFactor: 0.75, // やや小さくして反応速度を向上
		// フィルタリング設定
		thresholds: {
			// 1次フィルター (entityHelpers.ts)
			// スムージング後の微小変動を無視する閾値 (px) - より安定したアニメーション
			firstStage: 2,
			// 2次フィルター (popupPositioning.ts)
			// UI更新用の微小変動を無視する閾値 (px) - DOM更新を減らす
			secondStage: 1,
			// 大きな変動と見なす閾値 (px) - 即時反映される変動の閾値
			largeMovement: 40
		}
	},
	// 更新頻度の設定
	updateFrequency: {
		// カメラ変更イベントのスロットリング間隔 (ms)
		cameraChangeThrottle: 100,
		// レンダリングループのスロットリング間隔 (ms)
		renderLoopThrottle: 150,
		// イベント間の最小間隔 (ms) - これ以下の間隔で連続して呼び出された場合は後続を無視
		minUpdateInterval: 50,
		// 同一フレーム内での重複更新防止のデバウンス時間 (ms)
		duplicatePreventionDelay: 30
	}
};
