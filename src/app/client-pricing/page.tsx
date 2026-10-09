import type { Metadata } from 'next';
import ClientPlanCheckout from '@/components/ClientPlanCheckout';

export const metadata: Metadata = { title: 'Your client rate', robots: { index: false, follow: false } };

export default function ClientPricing() {
  return <section className="checkout-page" aria-labelledby="checkout-heading">
    <a className="checkout-back" href="/coaching/in-person">← All plans</a>
    <ClientPlanCheckout />
    <p className="client-changeover-note">Already paying by Direct Debit? Agree your changeover with <a href="mailto:chrisgkoufas.performance@gmail.com">Chris</a> before setting up again, so payments don’t overlap.</p>
    <p className="checkout-help">Need help? <a href="mailto:chrisgkoufas.performance@gmail.com">Contact Chris</a>. <a href="/privacy">Privacy</a></p>
  </section>;
}
