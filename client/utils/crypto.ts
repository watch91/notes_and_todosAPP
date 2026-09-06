import CryptoJS from 'crypto-js';

const SECRET_KEY = 'aiostation-switch-account-key-2024';

/**
 * AES-256 加密
 */
export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

/**
 * AES-256 解密
 */
export function decrypt(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
