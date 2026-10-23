import crypto from 'crypto';
import { config } from '../../config';

export class CryptoHelper {
    private static readonly SECRET_KEY = config.ENCRYPT_SECRET;
    private static readonly AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
    private static readonly IV_LENGTH = 12; // 12 bytes is recommended for GCM

    /**
     * Encrypts a string value using AES-GCM encryption
     * @param value - The string to encrypt
     * @returns The encrypted string (Base64 encoded)
     */
    public static encrypt(value: string): string {
        try {
            // Generate random IV
            const iv = crypto.randomBytes(this.IV_LENGTH);

            // Create cipher with AES-256-GCM
            const cipher = crypto.createCipheriv(
                'aes-256-gcm',
                Buffer.from(this.SECRET_KEY,'base64'),
                iv
            );

            // Encrypt the value
            const encrypted = Buffer.concat([
                cipher.update(value, 'utf8'),
                cipher.final()
            ]);

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            // Combine IV, encrypted data, and auth tag
            const combined = Buffer.concat([iv, encrypted, authTag]);

            return combined.toString('base64');
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt value');
        }
    }

    /**
     * Decrypts an encrypted string value
     * @param encryptedValue - The encrypted string to decrypt (Base64 encoded)
     * @returns The decrypted string
     */
    public static decrypt(encryptedValue: string): string {
        try {
            // Convert the combined string back to buffer
            const combined = Buffer.from(encryptedValue, 'base64');

            // Extract IV, ciphertext, and auth tag
            const iv = combined.subarray(0, this.IV_LENGTH);
            const encrypted = combined.subarray(
                this.IV_LENGTH,
                combined.length - this.AUTH_TAG_LENGTH
            );
            const authTag = combined.subarray(combined.length - this.AUTH_TAG_LENGTH);

            // Create decipher
            const decipher = crypto.createDecipheriv(
                'aes-256-gcm',
                Buffer.from(this.SECRET_KEY,'base64'),
                iv
            );

            // Set auth tag
            decipher.setAuthTag(authTag);

            // Decrypt the value
            const decrypted = Buffer.concat([
                decipher.update(encrypted),
                decipher.final()
            ]);

            return decrypted.toString('utf8');
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt value');
        }
    }
}
