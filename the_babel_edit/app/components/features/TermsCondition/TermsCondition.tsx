'use client'

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

export default function TermsAndConditions() {
  const params = useParams();
  const locale = params.locale as string || 'en';
  const { settings } = useSiteSettingsStore();
  const storeName = settings.store_name || 'The Babel Edit';
  const storeEmail = settings.store_contact_email || 'support@babeledit.com';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Terms and Conditions
          </h1>
          <p className="text-neutral-600">
            For the Supply of Products
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            Date Modified: August 3, 2025
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-neutral max-w-none">

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              1. IMPORTANT LEGAL NOTICE
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                These are the terms and conditions under which {storeName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) supplies products (&ldquo;Products&rdquo;) listed on our website www.thebabeledit.com (&ldquo;Our Site&rdquo;) to you.
              </p>
              <p>
                Please read these terms carefully before placing any order. By ordering Products from Our Site, you agree to be bound by these Terms and Conditions, as well as our Privacy Policy and Returns Policy.
              </p>
              <p className="font-medium">
                If you do not agree with these Terms, you should not use Our Site or purchase any Products.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              2. INFORMATION ABOUT US
            </h2>
            <div className="space-y-4 text-neutral-900 leading-relaxed">
              <p>
                {storeName} is a small, independent business based in the United States, founded with the mission of curating sustainable, pre-loved fashion rich in history and culture. For inquiries, please contact us at:
              </p>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="flex items-center gap-2">
                  <span className="text-lg">📧</span>
                  <a href={`mailto:${storeEmail}`} className="text-neutral-900 hover:text-neutral-600 transition-colors">
                    {storeEmail}
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              3. OUR PRODUCTS
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">3.1</span> All products sold are pre-loved, meaning they are previously owned but carefully selected for quality and uniqueness.
              </div>
              <div>
                <span className="font-medium">3.2</span> Product images on Our Site are for illustrative purposes only. Due to variations in screen settings, the actual colors of items may differ slightly.
              </div>
              <div>
                <span className="font-medium">3.3</span> Each item is described as accurately as possible, but minor discrepancies in size or wear may occur due to the vintage/pre-owned nature of the pieces.
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              4. ORDER ACCEPTANCE & CONTRACT
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">4.1</span> Your order is only considered accepted once you receive a confirmation email stating your item(s) have been dispatched.
              </div>
              <div>
                <span className="font-medium">4.2</span> We reserve the right to decline or cancel any order, including due to unavailability, suspected fraud, or pricing errors.
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              5. PRICING & PAYMENT
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">5.1</span> All prices are listed in USD.
              </div>
              <div>
                <span className="font-medium">5.2</span> Payment must be made in full at checkout via accepted payment methods (e.g., credit/debit cards, PayPal).
              </div>
              <div>
                <span className="font-medium">5.3</span> Prices are subject to change but will not affect confirmed orders.
              </div>
              <div>
                <span className="font-medium">5.4</span> Sales tax is applied where applicable by law.
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              6. DELIVERY
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">6.1</span> We ship within the U.S. and to select international countries.
              </div>
              <div>
                <span className="font-medium">6.2</span> Orders are typically processed within 3–5 business days.
              </div>
              <div>
                <span className="font-medium">6.3</span> You will receive tracking details once your order is shipped.
              </div>
              <div>
                <span className="font-medium">6.4</span> Shipping costs are displayed at checkout.
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              7. RETURNS & EXCHANGES
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">7.1</span> Due to the curated and limited nature of our pieces, we accept returns within <span className="font-medium text-neutral-900">15 calendar days</span> of delivery.
              </div>
              <div>
                <span className="font-medium">7.2</span> To qualify for a return, items must be in the same condition as received — unworn, unwashed, with any original tags or packaging.
              </div>
              <div>
                <span className="font-medium">7.3</span> After 15 days, returns or refunds will not be accepted.
              </div>
              <div>
                <span className="font-medium">7.4</span> Shipping costs are non-refundable. Return shipping is the responsibility of the customer unless otherwise stated.
              </div>
              <p className="mt-4">
                For details, please visit our <Link href={`/${locale}/returns-policy`} className="text-neutral-900 underline hover:text-neutral-600 transition-colors">Returns Policy</Link>.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              8. PRODUCT CONDITION
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">8.1</span> All items are pre-loved and may show minor signs of wear.
              </div>
              <div>
                <span className="font-medium">8.2</span> Any significant flaws will be disclosed in the product description.
              </div>
              <div>
                <span className="font-medium">8.3</span> By purchasing, you acknowledge and accept the nature of secondhand/vintage fashion.
              </div>
            </div>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              9. INTELLECTUAL PROPERTY
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                All content on Our Site, including logos, images, and text, is the property of {storeName} and may not be used without permission.
              </p>
            </div>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              10. LIMITATION OF LIABILITY
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                We are not liable for any indirect, incidental, or consequential damages resulting from the use of Our Site or Products. Our maximum liability for any claim shall not exceed the price of the Product purchased.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              11. EVENTS OUTSIDE OUR CONTROL
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                We are not responsible for delays or failures caused by events beyond our control (e.g., natural disasters, shipping disruptions, pandemics).
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              12. AMENDMENTS
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                We may update these Terms from time to time. The version applicable to your order is the one in effect at the time of purchase.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              13. GOVERNING LAW
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                These Terms are governed by the laws of the State of [insert your state], United States. Any disputes will be resolved under these laws.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6 pb-2 border-b border-neutral-200">
              14. AUTHENTICATION POLICY
            </h2>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <div>
                <span className="font-medium">14.1 Pre-Listing Authentication</span>
                <p className="mt-2">All designer goods listed for sale on {storeName} are authenticated prior to being made available on Our Site. This authentication is performed with diligence to ensure the legitimacy and quality of each item.</p>
              </div>
              <div>
                <span className="font-medium">14.2 Customer-Initiated Re-Authentication</span>
                <p className="mt-2">If a customer chooses to re-authenticate an item through a third-party service, they assume full responsibility for initiating and financing the process. The customer must email <a href={`mailto:${storeEmail}`} className="text-neutral-900 underline hover:text-neutral-600 transition-colors">{storeEmail}</a> with the full name and address of the selected authenticator.</p>
              </div>
              <div>
                <span className="font-medium">14.3 Shipping to Authenticator</span>
                <p className="mt-2">After receiving and confirming the authenticator&#39;s address and city, {storeName} will ship the item directly to the authenticator. Once authentication is complete, we will instruct the authenticator to send the item directly to the customer.</p>
              </div>
              <div>
                <span className="font-medium">14.4 Customer Responsibility</span>
                <p className="mt-2">The customer is responsible for all costs associated with re-authentication, including but not limited to third-party service fees and shipping from the authenticator to the final delivery address.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Message */}
        <div className="mt-16 pt-8 border-t border-neutral-200">
          <div className="text-center">
            <p className="text-neutral-600 italic text-lg">
              Thank you for supporting {storeName} — where style tells a story.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}