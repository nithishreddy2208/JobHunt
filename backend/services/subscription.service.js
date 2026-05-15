import { User } from '../models/user.model.js';

/**
 * SubscriptionService
 *
 * Centralizes subscription tier logic. Designed so that a real payment
 * provider (Razorpay/Stripe) can be added later without changing callers:
 *   - upgradeToPro(userId, { paymentRef })
 *   - cancelPro(userId)
 *   - getStatus(userId)
 *
 * For now, upgrade is a no-payment simulation.
 */

class SubscriptionService {
  async getStatus(userId) {
    // Return the full user (minus password) so the frontend's session probe (`/user/subscription`)
    // can hydrate `useAuth().user` on every page load, not only after login.
    const user = await User.findById(userId).select('-password').lean();
    if (!user) return null;
    return {
      subscription: user.subscription || 'FREE',
      isPro: Boolean(user.isPro),
      proSince: user.proSince || null,
      user
    };
  }

  async upgradeToPro(userId, { paymentRef = null } = {}) {
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          subscription: 'PRO',
          isPro: true,
          proSince: new Date()
        }
      },
      { new: true }
    ).select('-password');

    if (!updated) {
      throw new Error('User not found');
    }

    console.log(`[subscription] upgrade ok userId=${userId} paymentRef=${paymentRef || 'none'}`);
    return updated;
  }

  async cancelPro(userId) {
    const updated = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          subscription: 'FREE',
          isPro: false
        }
      },
      { new: true }
    ).select('-password');

    if (!updated) {
      throw new Error('User not found');
    }

    console.log(`[subscription] cancel ok userId=${userId}`);
    return updated;
  }
}

export const subscriptionService = new SubscriptionService();
