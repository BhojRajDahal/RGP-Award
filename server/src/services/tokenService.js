import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SECRET, EXPIRES_IN } from '../config/jwt.js';
import { env, cookieBaseOptions } from '../config/env.js';
import {
  createRefreshSession,
  findRefreshSessionByHash,
  revokeAllSessionsForPrincipal,
  revokeRefreshSessionByHash,
} from '../model/sessionModel.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const signAccessToken = (payload) =>
  jwt.sign(payload, SECRET, {
    expiresIn: EXPIRES_IN,
    issuer: 'nast-api',
    audience: 'nast-web',
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, SECRET, { issuer: 'nast-api', audience: 'nast-web' });

export const mintRefreshToken = async (principal) => {
  const raw = crypto.randomBytes(48).toString('hex');
  const token_hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await createRefreshSession({
    token_hash,
    user_id: principal.role === 'user' ? principal.user_id : null,
    admin_id: principal.role === 'admin' ? principal.aid : null,
    evaluator_id: principal.role === 'evaluator' ? principal.evaluator_id : null,
    role: principal.role,
    expires_at: expiresAt,
  });

  return raw;
};

export const rotateRefreshToken = async (existingRawToken) => {
  const existingHash = hashToken(existingRawToken);
  const current = await findRefreshSessionByHash(existingHash);
  if (!current) throw new Error('Invalid refresh session');
  if (current.revoked_at) throw new Error('Refresh session revoked');
  if (new Date(current.expires_at) < new Date()) throw new Error('Refresh session expired');

  await revokeRefreshSessionByHash(existingHash);
  const principal =
    current.role === 'admin'
      ? { role: 'admin', aid: current.admin_id }
      : current.role === 'evaluator'
        ? { role: 'evaluator', evaluator_id: current.evaluator_id }
        : { role: 'user', user_id: current.user_id };
  const nextToken = await mintRefreshToken(principal);
  return { principal, refreshToken: nextToken };
};

export const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  await revokeRefreshSessionByHash(hashToken(rawToken));
};

export const revokePrincipalSessions = async (principal) => {
  await revokeAllSessionsForPrincipal(principal);
};

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('access_token', accessToken, {
    ...cookieBaseOptions,
    maxAge: 3 * 60 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...cookieBaseOptions,
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie('access_token', cookieBaseOptions);
  res.clearCookie('refresh_token', cookieBaseOptions);
};
