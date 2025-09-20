import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      return res.status(200).json({ 
        success: true, 
        session: session 
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment not completed' 
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
