import 'server-only';

import Stripe from 'stripe';

import { getLogger } from '@kit/shared/logger';

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client instance (singleton pattern)
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY environment variable is not configured',
      );
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
      appInfo: {
        name: 'vantage-portal',
        version: '0.1.0',
      },
    });
  }

  return stripeInstance;
}

/**
 * Get the Stripe webhook secret
 */
export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET environment variable is not configured',
    );
  }

  return secret;
}

/**
 * Verify a Stripe webhook signature
 */
export async function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
): Promise<Stripe.Event> {
  const logger = await getLogger();
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );

    logger.info(
      { eventId: event.id, type: event.type },
      'Stripe webhook verified',
    );

    return event;
  } catch (error) {
    logger.error({ error }, 'Stripe webhook verification failed');
    throw error;
  }
}

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateStripeCustomer(params: {
  email: string;
  name?: string;
  accountId: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const logger = await getLogger();
  const stripe = getStripeClient();

  // Search for existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    const customer = existingCustomers.data[0];

    if (customer) {
      logger.info(
        { customerId: customer.id },
        'Found existing Stripe customer',
      );
      return customer;
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      accountId: params.accountId,
      ...params.metadata,
    },
  });

  logger.info({ customerId: customer.id }, 'Created new Stripe customer');

  return customer;
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  paymentMethodId: string,
  customerId: string,
): Promise<Stripe.PaymentMethod> {
  const stripe = getStripeClient();

  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * Set a default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = 'card',
): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripeClient();

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type,
  });

  return paymentMethods.data;
}

/**
 * Detach a payment method
 */
export async function detachPaymentMethod(
  paymentMethodId: string,
): Promise<Stripe.PaymentMethod> {
  const stripe = getStripeClient();

  return stripe.paymentMethods.detach(paymentMethodId);
}
