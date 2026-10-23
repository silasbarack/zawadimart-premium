import bcrypt from 'bcryptjs';
import { config } from '../config.js';

export const hashPassword = (password) => bcrypt.hash(password, config.bcryptRounds);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
