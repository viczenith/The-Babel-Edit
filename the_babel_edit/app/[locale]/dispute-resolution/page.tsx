'use client'

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, Clock, Shield, AlertCircle, CheckCircle, FileText, Package, CreditCard } from 'lucide-react';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';

const DisputeResolutionPage = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [selectedDisputeType, setSelectedDisputeType] = useState('');

  const toggleSection = (section: any) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const disputeTypes = [
    { id: 'product-condition', label: 'Product Condition Issues', description: 'Item received differs from description or has undisclosed damage' },
    { id: 'authentication', label: 'Authentication Concerns', description: 'Questions about item authenticity or requesting re-authentication' },
    { id: 'shipping-delivery', label: 'Shipping & Delivery', description: 'Lost packages, delivery delays, or shipping damage' },
    { id: 'returns-refunds', label: 'Returns & Refunds', description: 'Issues with return process or refund requests' },
    { id: 'billing-payment', label: 'Billing & Payment', description: 'Incorrect charges, payment issues, or pricing disputes' },
    { id: 'other', label: 'Other Issues', description: 'Any other concerns not covered above' }
  ];

  const resolutionSteps = [
    {
      step: 1,
      title: "Initial Contact",
      description: "Contact our support team within 15 days of delivery",
      timeframe: "Within 15 days",
      icon: <Mail className="w-6 h-6" />
    },
    {
      step: 2,
      title: "Review & Investigation",
      description: "We review your case and may request additional information",
      timeframe: "1-3 business days",
      icon: <FileText className="w-6 h-6" />
    },
    {
      step: 3,
      title: "Resolution Proposal",
      description: "We propose a solution based on our findings",
      timeframe: "2-5 business days",
      icon: <Shield className="w-6 h-6" />
    },
    {
      step: 4,
      title: "Final Resolution",
      description: "Implementation of agreed-upon solution",
      timeframe: "1-7 business days",
      icon: <CheckCircle className="w-6 h-6" />
    }
  ];

  return (
    <div>
      <Navbar />
      <div className="min-h-screen">
        {/* Header Section */}
        <div className=" text-white py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="w-16 h-16 text-amber-400" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Dispute Resolution Center</h1>
              <p className="text-xl text-slate-300  mx-auto text-center">
                We're committed to resolving any issues with your pre-loved fashion purchases fairly and efficiently
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Important Notice */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-8 rounded-r-lg">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Time-Sensitive Notice</h3>
                <p className="text-amber-700">
                  Due to the curated and limited nature of our pre-loved pieces, disputes must be initiated within
                  <strong> 15 calendar days of delivery</strong>. After this period, we cannot accept returns or process refunds.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Contact */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
              <Mail className="w-7 h-7 mr-3 text-slate-600" />
              Start a Dispute
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                    <Mail className="w-5 h-5 text-slate-600 mr-3" />
                    <div>
                      <p className="font-medium text-slate-800">Email Support</p>
                      <a href="mailto:support@babeledit.com" className="text-amber-600 hover:text-amber-700 transition-colors">
                        support@babeledit.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                    <Clock className="w-5 h-5 text-slate-600 mr-3" />
                    <div>
                      <p className="font-medium text-slate-800">Response Time</p>
                      <p className="text-slate-600">Within 24-48 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">What to Include</h3>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Order number and date of purchase
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Clear photos of the item and any issues
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Detailed description of the problem
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    Your preferred resolution
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Dispute Types */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Common Dispute Types</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {disputeTypes.map((type) => (
                <div key={type.id} className="border border-slate-200 rounded-lg p-4 hover:border-amber-400 hover:bg-amber-50 transition-all cursor-pointer">
                  <h3 className="font-semibold text-slate-800 mb-2">{type.label}</h3>
                  <p className="text-slate-600 text-sm">{type.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Process */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">Our Resolution Process</h2>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-slate-200 hidden md:block"></div>

              <div className="space-y-8">
                {resolutionSteps.map((step, index) => (
                  <div key={step.step} className="relative flex items-start">
                    {/* Step number circle */}
                    <div className="hidden md:flex absolute -left-2 w-16 h-16 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full items-center justify-center text-white font-bold text-lg shadow-lg z-10">
                      {step.step}
                    </div>

                    {/* Content */}
                    <div className="md:ml-20 bg-slate-50 rounded-lg p-6 w-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="md:hidden mr-4 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold">
                            {step.step}
                          </div>
                          <div className="text-amber-600 mr-3">
                            {step.icon}
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800">{step.title}</h3>
                        </div>
                        <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full">
                          {step.timeframe}
                        </span>
                      </div>
                      <p className="text-slate-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Frequently Asked Questions</h2>

            <div className="space-y-4">
              {[
                {
                  id: 'authentication-policy',
                  question: 'What is your authentication policy?',
                  answer: 'All designer goods are pre-authenticated before listing. If you choose to re-authenticate through a third-party service, you are responsible for all associated costs including service fees and shipping. Contact us at support@babeledit.com with your chosen authenticator\'s details.'
                },
                {
                  id: 'return-timeframe',
                  question: 'How long do I have to return an item?',
                  answer: 'Due to the curated nature of our pieces, returns must be initiated within 15 calendar days of delivery. Items must be in the same condition as received - unworn, unwashed, with original tags or packaging.'
                },
                {
                  id: 'shipping-costs',
                  question: 'Who pays for return shipping?',
                  answer: 'Return shipping is typically the customer\'s responsibility unless the return is due to our error (wrong item sent, undisclosed damage, etc.). Original shipping costs are non-refundable.'
                },
                {
                  id: 'pre-loved-nature',
                  question: 'What should I expect from pre-loved items?',
                  answer: 'All items are pre-owned and may show minor signs of wear consistent with their vintage/secondhand nature. Any significant flaws are disclosed in the product description. By purchasing, you acknowledge and accept this nature.'
                },
                {
                  id: 'dispute-resolution',
                  question: 'What if we can\'t reach an agreement?',
                  answer: 'Our disputes are governed by the laws of the United States. We strive to resolve all issues amicably, but in rare cases where resolution isn\'t possible, legal remedies may be pursued under applicable state law.'
                }
              ].map((faq) => (
                <div key={faq.id} className="border border-slate-200 rounded-lg">
                  <button
                    onClick={() => toggleSection(faq.id)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{faq.question}</span>
                    {expandedSection === faq.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                  {expandedSection === faq.id && (
                    <div className="px-6 pb-4 text-slate-600 border-t border-slate-100">
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Still Need Help?</h3>
            <p className="text-amber-100 mb-6 mx-auto">
              Our customer support team is here to help resolve any issues you may have with your pre-loved fashion purchases.
            </p>
            <a
              href="mailto:support@babeledit.com"
              className="inline-flex items-center bg-white text-amber-600 px-8 py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors"
            >
              <Mail className="w-5 h-5 mr-2" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DisputeResolutionPage;