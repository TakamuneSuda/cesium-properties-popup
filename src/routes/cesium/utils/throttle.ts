/**
 * スロットリング用ヘルパー関数 - パフォーマンス最適化版
 * 指定した間隔内での関数呼び出しを制限し、高頻度の実行を防ぎます
 *
 * @param callback 実行する関数
 * @param delay スロットリングの間隔（ミリ秒）
 * @returns スロットリングされた関数
 */
export function throttle<F extends (...args: never[]) => ReturnType<F>>(
	callback: F,
	delay: number
): (...args: Parameters<F>) => void {
	let lastCall = 0;
	let timeoutId: number | undefined;
	let lastArgs: Parameters<F> | undefined;
	let requestFrameId: number | undefined;

	return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
		// thisコンテキストはapply内で直接使用する
		lastArgs = args; // 常に最新の引数を保持
		const now = Date.now();
		const timeSinceLastCall = now - lastCall;

		// 前回の呼び出しから十分な時間が経過している場合
		if (timeSinceLastCall >= delay) {
			// キャンセル可能なリクエストがあれば解除
			if (requestFrameId) {
				cancelAnimationFrame(requestFrameId);
				requestFrameId = undefined;
			}

			lastCall = now;

			// 実行はrequestAnimationFrameを利用して、ブラウザの描画タイミングに合わせる
			requestFrameId = requestAnimationFrame(() => {
				callback.apply(this, args);
				requestFrameId = undefined;
			});
		} else {
			// 前回の呼び出しから指定時間経過していない場合、タイマーをリセット
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}

			// 遅延タイマーをセット
			timeoutId = Number(
				setTimeout(() => {
					lastCall = Date.now();

					// 最後の実行もrequestAnimationFrameを使用
					requestFrameId = requestAnimationFrame(() => {
						if (lastArgs !== undefined) {
							callback.apply(this, lastArgs);
						}
						requestFrameId = undefined;
					});
				}, delay - timeSinceLastCall)
			);
		}
	};
}
