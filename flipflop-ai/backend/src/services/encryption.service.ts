import crypto from 'crypto';
import { logger } from '../utils/logger.js';

class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private secretKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      // Generate a key for development (use proper key in production)
      logger.warn('No ENCRYPTION_KEY found, generating one for development');
      this.secretKey = crypto.randomBytes(32);
    } else {
      this.secretKey = Buffer.from(key, 'hex');
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data: any): string {
    try {
      const text = JSON.stringify(data);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // For simplified encryption, just use iv and encrypted data
      const result = iv.toString('hex') + ':' + encrypted;
      return result;
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string): any {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      // const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt integration credentials
   */
  encryptCredentials(credentials: Record<string, any>): string {
    return this.encrypt(credentials);
  }

  /**
   * Decrypt integration credentials
   */
  decryptCredentials(encryptedCredentials: string): Record<string, any> {
    return this.decrypt(encryptedCredentials);
  }
}

// Export singleton instance
export const encryption = new EncryptionService();