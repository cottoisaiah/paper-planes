import express from 'express';
import Stripe from 'stripe';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Initialize Stripe with proper error handling
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil' as any,
});

// Get pricing based on user's API key status
router.get('/pricing', authenticate, async (req: any, res: any) => {
  try {
    const user = req.user;
    
    // Return correct price IDs based on whether user has own API keys
    const pricing = user.hasOwnApiKeys ? {
      monthly: 'price_1S2httAmx3PBCGtX2fymngYt', // $20/month
      annual: 'price_1S2hulAmx3PBCGtXIMm5OKv2'   // $225/year
    } : {
      monthly: 'price_1S2hrVAmx3PBCGtXitcOFEHM', // $100/month
      annual: 'price_1S2ht1Amx3PBCGtXToeGKJHT'   // $1000/year
    };
    
    res.json({ success: true, pricing });
  } catch (error: any) {
    logger.error('Error getting pricing:', error);
    res.status(500).json({ success: false, message: 'Failed to get pricing' });
  }
});

// Debug endpoint to check authentication
router.post('/debug-auth', async (req: any, res: any) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  res.json({
    hasAuthHeader: !!authHeader,
    token: token ? token.substring(0, 20) + '...' : null,
    body: req.body
  });
});

router.post('/create-subscription', authenticate, async (req: any, res: any) => {
  try {
    const { priceId } = req.body;
    const user = req.user;
    
    if (!priceId) {
      return res.status(400).json({ success: false, message: 'Price ID is required' });
    }
    
    // Convert product IDs to price IDs for backward compatibility
    const productToPriceMap: { [key: string]: string } = {
      'prod_SyfE9zxGySSLc0': 'price_1S2httAmx3PBCGtX2fymngYt', // Monthly with keys
      'prod_SyfFkur332pLYD': 'price_1S2hulAmx3PBCGtXIMm5OKv2', // Annual with keys  
      'prod_SyfB70xwWsnV0b': 'price_1S2hrVAmx3PBCGtXitcOFEHM', // Monthly shared
      'prod_SyfDVDL5Dpq1I5': 'price_1S2ht1Amx3PBCGtXToeGKJHT'  // Annual shared
    };
    
    // Use the mapped price ID if it's a product ID, otherwise use the provided ID
    const actualPriceId = productToPriceMap[priceId] || priceId;
    
    // Validate price ID
    const validPriceIds = [
      'price_1S2httAmx3PBCGtX2fymngYt', // Monthly with keys
      'price_1S2hulAmx3PBCGtXIMm5OKv2', // Annual with keys
      'price_1S2hrVAmx3PBCGtXitcOFEHM', // Monthly shared
      'price_1S2ht1Amx3PBCGtXToeGKJHT'  // Annual shared
    ];
    
    if (!validPriceIds.includes(actualPriceId)) {
      return res.status(400).json({ success: false, message: `Invalid price ID: ${actualPriceId}` });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: actualPriceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
      client_reference_id: user._id.toString(),
      customer_email: user.email || `${user.xUsername}@twitter-placeholder.com`,
      metadata: {
        userId: user._id.toString(),
        xUsername: user.xUsername
      }
    });
    
    logger.info('Stripe checkout session created', {
      sessionId: session.id,
      userId: user._id,
      priceId
    });
    
    res.json({ success: true, url: session.url });
  } catch (error: any) {
    logger.error('Error creating subscription:', {
      error: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
      param: error.param,
      requestId: error.requestId,
      userId: req.user?._id,
      priceId: req.body?.priceId
    });
    
    // Return specific error message if available
    const errorMessage = error.message || 'Failed to create subscription checkout';
    res.status(400).json({ 
      success: false, 
      message: errorMessage
    });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await User.findByIdAndUpdate(userId, {
            subscriptionId: subscription.id,
            subscriptionStatus: 'active'
          });
          
          logger.info('Subscription activated', {
            userId,
            subscriptionId: subscription.id
          });
        }
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by subscription ID
        const user = await User.findOne({ subscriptionId: subscription.id });
        if (user) {
          const status = subscription.status === 'active' ? 'active' : 
                        subscription.status === 'canceled' ? 'canceled' : 'inactive';
          
          await User.findByIdAndUpdate(user._id, {
            subscriptionStatus: status
          });
          
          logger.info('Subscription status updated', {
            userId: user._id,
            subscriptionId: subscription.id,
            status
          });
        }
        break;
        
      default:
        logger.info('Unhandled webhook event type:', event.type);
    }
    
    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ received: false });
  }
});

// Get current subscription status
router.get('/subscription-status', authenticate, async (req: any, res: any) => {
  try {
    const user = req.user;
    
    if (!user.subscriptionId) {
      return res.json({ 
        success: true, 
        subscription: null, 
        status: 'inactive' 
      });
    }
    
    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId) as any;
    
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      },
      status: subscription.status
    });
  } catch (error: any) {
    logger.error('Error getting subscription status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get subscription status' 
    });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticate, async (req: any, res: any) => {
  try {
    const user = req.user;
    
    if (!user.subscriptionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active subscription found' 
      });
    }
    
    const subscription = await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true
    });
    
    logger.info('Subscription canceled', {
      userId: user._id,
      subscriptionId: subscription.id
    });
    
    res.json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the current period' 
    });
  } catch (error: any) {
    logger.error('Error canceling subscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel subscription' 
    });
  }
});

export default router;
