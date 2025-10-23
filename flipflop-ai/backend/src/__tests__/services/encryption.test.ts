import { encryption } from '../../services/encryption.service.js';

describe('EncryptionService', () => {
  const testData = { username: 'test', password: 'secret123' };

  beforeEach(() => {
    // Set test encryption key
    process.env.ENCRYPTION_KEY = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b';
  });

  describe('encryptCredentials and decryptCredentials', () => {
    it('should encrypt and decrypt credentials correctly', () => {
      const encrypted = encryption.encryptCredentials(testData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(JSON.stringify(testData));

      const decrypted = encryption.decryptCredentials(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should produce different encrypted strings for same data', () => {
      const encrypted1 = encryption.encryptCredentials(testData);
      const encrypted2 = encryption.encryptCredentials(testData);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same data
      expect(encryption.decryptCredentials(encrypted1)).toEqual(testData);
      expect(encryption.decryptCredentials(encrypted2)).toEqual(testData);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => {
        encryption.decryptCredentials('invalid-data');
      }).toThrow('Failed to decrypt credentials');
    });
  });

  describe('generateToken', () => {
    it('should generate tokens of specified length', () => {
      const token16 = encryption.generateToken(16);
      const token32 = encryption.generateToken(32);
      
      expect(token16).toHaveLength(32); // hex encoding doubles length
      expect(token32).toHaveLength(64);
      expect(token16).not.toBe(token32);
    });

    it('should generate unique tokens', () => {
      const tokens = Array.from({ length: 10 }, () => encryption.generateToken());
      const uniqueTokens = new Set(tokens);
      
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });
});