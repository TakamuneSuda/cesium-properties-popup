/**
 * terrainHeightCache.ts のテスト
 */
import { LRUCache } from './terrainHeightCache';

describe('LRUCache', () => {
	it('指定したサイズを維持し、最も古いエントリを削除する', () => {
		const cache = new LRUCache<string, number>(3);

		// キャッシュに項目を追加
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);

		// 全ての項目が存在するはず
		expect(cache.has('a')).toBe(true);
		expect(cache.has('b')).toBe(true);
		expect(cache.has('c')).toBe(true);
		expect(cache.size).toBe(3);

		// サイズを超える項目を追加
		cache.set('d', 4);

		// 'a'は削除されるはず
		expect(cache.has('a')).toBe(false);
		expect(cache.has('b')).toBe(true);
		expect(cache.has('c')).toBe(true);
		expect(cache.has('d')).toBe(true);
		expect(cache.size).toBe(3);
	});

	it('アクセスするとLRU順が更新される', () => {
		const cache = new LRUCache<string, number>(3);

		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);

		// 'a'にアクセスして順番を更新
		const valueA = cache.get('a'); // 'a'が最新になる
		expect(valueA).toBe(1);

		// 新しい項目を追加
		cache.set('d', 4);

		// 'b'が最も古くなるので削除される
		expect(cache.has('a')).toBe(true); // 'a'は保持される
		expect(cache.has('b')).toBe(false); // 'b'は削除される
		expect(cache.has('c')).toBe(true);
		expect(cache.has('d')).toBe(true);
	});

	it('統計情報を正しく収集する', () => {
		const cache = new LRUCache<string, number>(5);

		// いくつかの値を設定
		cache.set('a', 1);
		cache.set('b', 2);
		cache.set('c', 3);

		// いくつかのキーへアクセス
		cache.get('a'); // ヒット
		cache.get('b'); // ヒット
		cache.get('x'); // ミス
		cache.get('y'); // ミス

		// 統計を確認
		const stats = cache.getStats();
		expect(stats.hits).toBe(2); // 2回ヒット
		expect(stats.misses).toBe(2); // 2回ミス
		expect(stats.hitRatio).toBe(0.5); // ヒット率50%
		expect(stats.size).toBe(3);
		expect(stats.maxSize).toBe(5);

		// キャッシュクリア
		cache.clear();
		expect(cache.size).toBe(0);
		expect(cache.getStats().hits).toBe(0); // 統計もリセットされる
		expect(cache.getStats().misses).toBe(0);
	});
});
