import User from '@/models/User';
import crypto from 'crypto';

export const generateUniqueUsername = async (base: string) => {
  let username = base;
  let counter = 0;

  while (true) {
    const existingUser = await User.findOne({ username });
    if (!existingUser) break;
    counter++;
    username = `${base}-${counter}`;
  }

  return username;
};

export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000);
};

export const generateExpiresIn = (minutes: number) => {
  return Date.now() + minutes * 60 * 1000;
};

export const getSecondsLeft = (timestamp: Date | string) => {
  const expiryTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diff = Math.floor((expiryTime - now) / 1000);
  return Math.max(0, diff);
};
