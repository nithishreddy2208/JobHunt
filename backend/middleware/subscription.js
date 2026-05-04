import { User } from '../models/user.model.js';
import { redisService } from '../services/redis.service.js';

const AI_FREE_DAILY_LIMIT = Number(process.env.AI_FREE_DAILY_LIMIT) || 3;
const APPLICATION_FREE_DAILY_LIMIT = Number(process.env.APPLICATION_FREE_DAILY_LIMIT) || 5;
const DAY_TTL_SECONDS = 24 * 60 * 60;

const todayString = () => {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const loadUser = async (req) => {
  if (req._subscriptionUser) return req._subscriptionUser;
  const user = await User.findById(req.userId).select('subscription isPro').lean();
  req._subscriptionUser = user;
  return user;
};

/**
 * Attach { isPro, subscription } to req for downstream consumers.
 * Safe no-op if user is not authenticated.
 */
export const attachSubscription = async (req, _res, next) => {
  try {
    if (!req.userId) return next();
    const user = await loadUser(req);
    req.isPro = Boolean(user?.isPro);
    req.subscription = user?.subscription || 'FREE';
    next();
  } catch (err) {
    console.error('[subscription] attach failed:', err?.message || err);
    next();
  }
};

/**
 * Hard gate: only PRO users may proceed.
 */
export const requirePro = async (req, res, next) => {
  try {
    const user = await loadUser(req);
    if (!user?.isPro) {
      return res.status(403).json({
        success: false,
        message: 'PRO subscription required',
        upgradeUrl: '/api/user/upgrade'
      });
    }
    next();
  } catch (err) {
    console.error('[subscription] requirePro failed:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Subscription check failed' });
  }
};

/**
 * Generic per-day Redis quota.
 * - Pro users bypass.
 * - Free users get a limited daily count.
 *
 * @param {object} opts
 * @param {string} opts.scope          short label, e.g. 'ai' or 'application'
 * @param {string} opts.keyPrefix      redis key prefix, e.g. 'jobhunt:ai:usage'
 * @param {number} opts.freeDailyLimit numeric daily cap for FREE users
 */
const buildDailyQuota = ({ scope, keyPrefix, freeDailyLimit }) => async (req, res, next) => {
  try {
    const user = await loadUser(req);
    if (user?.isPro) return next();

    const key = `${keyPrefix}:userId:${req.userId}:date:${todayString()}`;
    const count = await redisService.incrWithTtl(key, DAY_TTL_SECONDS);

    // If Redis is unavailable, fail-open (do not block users due to infra issue)
    if (count == null) return next();

    if (count > freeDailyLimit) {
      console.log(`[limit] scope=${scope} userId=${req.userId} count=${count} limit=${freeDailyLimit} blocked=true`);
      return res.status(429).json({
        success: false,
        message: `Daily ${scope} limit reached for FREE plan (${freeDailyLimit}/day). Upgrade to PRO for unlimited access.`,
        limit: freeDailyLimit,
        used: count,
        upgradeUrl: '/api/user/upgrade'
      });
    }

    res.setHeader('X-RateLimit-Limit', String(freeDailyLimit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, freeDailyLimit - count)));
    next();
  } catch (err) {
    console.error(`[subscription] ${scope} quota failed (fail-open):`, err?.message || err);
    next();
  }
};

export const aiUsageLimit = buildDailyQuota({
  scope: 'ai',
  keyPrefix: 'jobhunt:ai:usage',
  freeDailyLimit: AI_FREE_DAILY_LIMIT
});

export const applicationLimit = buildDailyQuota({
  scope: 'application',
  keyPrefix: 'jobhunt:application:count',
  freeDailyLimit: APPLICATION_FREE_DAILY_LIMIT
});
