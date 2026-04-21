/**
 * Provider Registry — auto-registers all payment provider adapters.
 * Import this once at the top of any server-side entry point that needs providers.
 */

import { paymentProviderService } from './payment-provider.service';
import { paystackCustomerAdapter } from './paystack-customer.service';
import { flutterwaveAdapter } from './flutterwave.service';

let registered = false;

export function ensureProvidersRegistered() {
  if (registered) return;
  paymentProviderService.register(paystackCustomerAdapter);
  paymentProviderService.register(flutterwaveAdapter);
  registered = true;
}
