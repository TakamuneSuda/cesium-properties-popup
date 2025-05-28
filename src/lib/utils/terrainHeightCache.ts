/**
 * LRUキャッシュの実装
 * Least Recently Used（最近最も使われていない）アルゴリズムを使用して、
 * キャッシュサイズが上限に達した時に最も古く使用されたエントリを削除します
 */
export class LRUCache<K, V> {
	private cache = new Map<K, V>();
	private readonly maxSize: number;
	private hits = 0;
	private misses = 0;

	/**
	 * LRUキャッシュを初期化
	 *
	 * @param maxSize キャッシュの最大サイズ
	 */
	constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	/**
	 * キャッシュからデータを取得し、最近使用したものとして更新
	 *
	 * @param key キャッシュのキー
	 * @returns キャッシュに存在する場合はその値、存在しない場合はundefined
	 */
	get(key: K): V | undefined {
		// キャッシュにあれば取り出して最新に更新
		if (this.cache.has(key)) {
			this.hits++;
			const value = this.cache.get(key)!;
			// 最近使用したエントリを最新として扱うために一旦削除して再設定
			this.cache.delete(key);
			this.cache.set(key, value);
			return value;
		}

		this.misses++;
		return undefined;
	}

	/**
	 * キャッシュにデータを設定
	 *
	 * @param key キャッシュのキー
	 * @param value 保存する値
	 */
	set(key: K, value: V): void {
		// すでにキーがある場合は削除
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}
		// キャッシュサイズが上限に達していれば最も古いエントリを削除
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}
		// 新しいエントリを追加
		this.cache.set(key, value);
	}

	/**
	 * キャッシュをクリア
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * 現在のキャッシュサイズを取得
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * キーがキャッシュに存在するか確認
	 *
	 * @param key 確認するキー
	 * @returns キャッシュに存在する場合はtrue、存在しない場合はfalse
	 */
	has(key: K): boolean {
		return this.cache.has(key);
	}

	/**
	 * キャッシュの統計情報を取得
	 *
	 * @returns キャッシュのヒット数、ミス数、ヒット率等の統計情報
	 */
	getStats() {
		const totalAccess = this.hits + this.misses;
		return {
			hits: this.hits,
			misses: this.misses,
			hitRatio: totalAccess > 0 ? this.hits / totalAccess : 0,
			size: this.cache.size,
			maxSize: this.maxSize
		};
	}
}
