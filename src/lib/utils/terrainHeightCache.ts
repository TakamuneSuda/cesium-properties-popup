/**
 * LRU Cache Implementation
 * Uses the Least Recently Used algorithm to delete the oldest used entry
 * when the cache size reaches the maximum limit
 */
export class LRUCache<K, V> {
	private cache = new Map<K, V>();
	private readonly maxSize: number;
	private hits = 0;
	private misses = 0;

	/**
	 * Initialize LRU cache
	 *
	 * @param maxSize Maximum cache size
	 */
	constructor(maxSize: number) {
		this.maxSize = maxSize;
	}

	/**
	 * Get data from cache and update as recently used
	 *
	 * @param key Cache key
	 * @returns Value if exists in cache, undefined otherwise
	 */
	get(key: K): V | undefined {
		// If in cache, retrieve and update as most recent
		if (this.cache.has(key)) {
			this.hits++;
			const value = this.cache.get(key)!;
			// Delete and re-add to mark as most recently used
			this.cache.delete(key);
			this.cache.set(key, value);
			return value;
		}

		this.misses++;
		return undefined;
	}

	/**
	 * Set data in cache
	 *
	 * @param key Cache key
	 * @param value Value to store
	 */
	set(key: K, value: V): void {
		// Delete if key already exists
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}
		// If cache size has reached maximum, remove oldest entry
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) {
				this.cache.delete(oldestKey);
			}
		}
		// Add new entry
		this.cache.set(key, value);
	}

	/**
	 * Clear cache
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Get current cache size
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Check if key exists in cache
	 *
	 * @param key Key to check
	 * @returns true if exists in cache, false otherwise
	 */
	has(key: K): boolean {
		return this.cache.has(key);
	}

	/**
	 * Get cache statistics
	 *
	 * @returns Statistics including hits, misses, hit ratio, etc.
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
