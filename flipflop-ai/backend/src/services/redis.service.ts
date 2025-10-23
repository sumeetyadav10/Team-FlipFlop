import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

class RedisService {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    this.client = new (IORedis as any)(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (err: any) => {
      this.isConnected = false;
      logger.error('Redis connection error:', err);
    });
  }

  /**
   * Cache Management
   */
  
  // Set value with TTL (in seconds)
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  // Get value
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  // Delete key
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis del error:', error);
    }
  }

  // Delete keys by pattern
  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error('Redis delByPattern error:', error);
    }
  }

  /**
   * Session Management
   */
  
  async setSession(sessionId: string, data: any, ttl = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession(sessionId: string): Promise<any> {
    return this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  /**
   * Team Cache
   */
  
  async cacheTeam(teamId: string, data: any, ttl = 3600): Promise<void> {
    await this.set(`team:${teamId}`, data, ttl);
  }

  async getTeam(teamId: string): Promise<any> {
    return this.get(`team:${teamId}`);
  }

  async invalidateTeam(teamId: string): Promise<void> {
    await this.delByPattern(`team:${teamId}*`);
    await this.delByPattern(`team_members:${teamId}*`);
  }

  /**
   * Query Cache
   */
  
  async cacheQuery(queryHash: string, result: any, ttl = 1800): Promise<void> {
    await this.set(`query:${queryHash}`, result, ttl);
  }

  async getQuery(queryHash: string): Promise<any> {
    return this.get(`query:${queryHash}`);
  }

  /**
   * Meeting Transcript Buffer
   */
  
  async addTranscriptChunk(meetingId: string, chunk: any): Promise<void> {
    if (!this.isConnected) return;

    try {
      const key = `transcript:${meetingId}`;
      await this.client.rpush(key, JSON.stringify(chunk));
      await this.client.expire(key, 7200); // 2 hour TTL
    } catch (error) {
      logger.error('Redis transcript error:', error);
    }
  }

  async getTranscriptChunks(meetingId: string): Promise<any[]> {
    if (!this.isConnected) return [];

    try {
      const key = `transcript:${meetingId}`;
      const chunks = await this.client.lrange(key, 0, -1);
      return chunks.map((chunk: any) => JSON.parse(chunk));
    } catch (error) {
      logger.error('Redis get transcript error:', error);
      return [];
    }
  }

  async clearTranscript(meetingId: string): Promise<void> {
    await this.del(`transcript:${meetingId}`);
  }

  /**
   * Rate Limiting
   */
  
  async incrementRateLimit(key: string, window = 60): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, window);
      const results = await multi.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      return 0;
    }
  }

  /**
   * Distributed Locks
   */
  
  async acquireLock(key: string, ttl = 30): Promise<boolean> {
    if (!this.isConnected) return true; // Allow operation if Redis is down

    try {
      const lockKey = `lock:${key}`;
      const result = await this.client.set(lockKey, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error('Redis lock error:', error);
      return true; // Allow operation on error
    }
  }

  async releaseLock(key: string): Promise<void> {
    await this.del(`lock:${key}`);
  }

  /**
   * Utility Methods
   */
  
  async ping(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

// Export singleton instance
export const redis = new RedisService();