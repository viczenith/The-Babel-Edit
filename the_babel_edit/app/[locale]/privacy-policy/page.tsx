'use client'

import React, { useState } from 'react';
import { Shield, Eye, Lock, User, Mail, CreditCard, Globe, Settings, AlertCircle, CheckCircle, FileText, Database } from 'lucide-react';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

const PrivacyPolicy = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const { settings } = useSiteSettingsStore();
  const storeName = settings.store_name || 'The Babel Edit';
  const storeEmail = settings.store_contact_email || 'support@babeledit.com';

  const toggleSection = (section: any) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const dataTypes = [
    {
      category: "Personal Information",
      icon: <User className="w-6 h-6" />,
      items: ["Name and contact information", "Billing and shipping addresses", "Phone number", "Email address"]
    },
    {
      category: "Payment Information",
      icon: <CreditCard className="w-6 h-6" />,
      items: ["Credit/debit card information", "PayPal account details", "Billing address", "Transaction history"]
    },
    {
      category: "Account Data",
      icon: <Settings className="w-6 h-6" />,
      items: ["Account preferences", "Purchase history", "Saved items and wishlists", "Communication preferences"]
    },
    {
      category: "Technical Information",
      icon: <Globe className="w-6 h-6" />,
      items: ["IP address and location data", "Browser type and version", "Device information", "Website usage analytics"]
    }
  ];

  const privacyRights = [
    {
      right: "Access Your Data",
      description: "Request a copy of all personal information we have about you",
      icon: <Eye className="w-5 h-5" />
    },
    {
      right: "Correct Information",
      description: "Update or correct any inaccurate personal information",
      icon: <Settings className="w-5 h-5" />
    },
    {
      right: "Delete Your Data",
      description: "Request deletion of your personal information (subject to legal requirements)",
      icon: <AlertCircle className="w-5 h-5" />
    },
    {
      right: "Opt-Out of Marketing",
      description: "Unsubscribe from promotional emails and marketing communications",
      icon: <Mail className="w-5 h-5" />
    },
    {
      right: "Data Portability",
      description: "Receive your data in a portable format to transfer to another service",
      icon: <Database className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Header Section */}
      <div className=" text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="w-16 h-16 text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-slate-300 mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your personal information.
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Last updated: August 3, 2025
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Quick Overview */}
        <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Our Privacy Commitment</h3>
              <p className="text-green-700">
                {storeName} is committed to protecting your privacy and personal information. We only collect 
                data necessary to provide our curated pre-loved fashion service and never sell your information 
                to third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <FileText className="w-7 h-7 mr-3 text-slate-600" />
            About This Policy
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">Company Information</h3>
              <div className="space-y-3 text-slate-600">
                <p><strong>Business Name:</strong> {storeName}</p>
                <p><strong>Website:</strong> www.thebabeledit.com</p>
                <p><strong>Contact:</strong> {storeEmail}</p>
                <p><strong>Location:</strong> {settings.store_address || 'United States'}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">What This Policy Covers</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" />
                  Information we collect and why
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" />
                  How we use and protect your data
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" />
                  Your rights and choices
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" />
                  Contact information for questions
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Information We Collect */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Database className="w-7 h-7 mr-3 text-slate-600" />
            Information We Collect
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {dataTypes.map((type, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-6 hover:border-green-400 hover:bg-green-50 transition-all">
                <div className="flex items-center mb-4">
                  <div className="text-green-600 mr-3">
                    {type.icon}
                  </div>
                  <h3 className="font-semibold text-slate-800">{type.category}</h3>
                </div>
                <ul className="space-y-2">
                  {type.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-slate-600 text-sm flex items-start">
                      <CheckCircle className="w-3 h-3 text-green-600 mr-2 mt-1 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold text-slate-800 mb-2">How We Collect Information</h3>
            <p className="text-slate-600 text-sm">
              We collect information when you create an account, make a purchase, contact customer support, 
              subscribe to our newsletter, or browse our website. We also use cookies and similar technologies 
              to improve your shopping experience and analyze website usage.
            </p>
          </div>
        </div>

        {/* How We Use Information */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Settings className="w-7 h-7 mr-3 text-slate-600" />
            How We Use Your Information
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Process Orders</h3>
              <p className="text-slate-600 text-sm">
                To process payments, fulfill orders, and provide customer support for your purchases.
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Communication</h3>
              <p className="text-slate-600 text-sm">
                To send order updates, respond to inquiries, and share curated fashion content (with your consent).
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Improve Service</h3>
              <p className="text-slate-600 text-sm">
                To analyze website usage, improve our product selection, and enhance your shopping experience.
              </p>
            </div>
          </div>

          <div className="mt-8 bg-amber-50 p-6 rounded-lg border-l-4 border-amber-400">
            <h3 className="font-semibold text-amber-800 mb-2">Marketing Communications</h3>
            <p className="text-amber-700 text-sm">
              We may send you promotional emails about new arrivals, special offers, and curated collections. 
              You can opt-out at any time by clicking "unsubscribe" in any email or contacting us directly.
            </p>
          </div>
        </div>

        {/* Data Sharing & Security */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Lock className="w-7 h-7 mr-3 text-slate-600" />
            Data Sharing & Security
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">We Share Information With:</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">Payment Processors</p>
                    <p className="text-slate-600 text-sm">Stripe, PayPal, and other secure payment services</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">Shipping Partners</p>
                    <p className="text-slate-600 text-sm">Delivery services to fulfill your orders</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">Authentication Services</p>
                    <p className="text-slate-600 text-sm">Third-party authenticators when requested</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">Security Measures:</h3>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <Lock className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-slate-700 text-sm">SSL encryption for all data transmission</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-slate-700 text-sm">Secure payment processing (PCI compliant)</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <Database className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-slate-700 text-sm">Protected servers and access controls</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <Eye className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-slate-700 text-sm">Regular security audits and monitoring</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-red-50 p-4 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              We Never Sell Your Data
            </h3>
            <p className="text-red-700 text-sm">
              {storeName} does not sell, rent, or trade your personal information to third parties for 
              marketing purposes. We only share data as necessary to provide our services.
            </p>
          </div>
        </div>

        {/* Your Privacy Rights */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <User className="w-7 h-7 mr-3 text-slate-600" />
            Your Privacy Rights
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {privacyRights.map((right, index) => (
              <div key={index} className="flex items-start p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all">
                <div className="text-blue-600 mr-3 mt-0.5">
                  {right.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">{right.right}</h3>
                  <p className="text-slate-600 text-sm">{right.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3">How to Exercise Your Rights</h3>
            <p className="text-blue-700 text-sm mb-4">
              To exercise any of these privacy rights, please contact us at {storeEmail} with your 
              request. We will respond within 30 days and may need to verify your identity for security purposes.
            </p>
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-blue-600 mr-2" />
              <a href={`mailto:${storeEmail}`} className="text-blue-600 hover:text-blue-800 font-medium">
                {storeEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Cookies & Tracking */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Cookies & Tracking Technologies</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">What Are Cookies?</h3>
              <p className="text-slate-600 mb-4">
                Cookies are small text files stored on your device that help us provide a better shopping 
                experience. They remember your preferences, keep you logged in, and help us understand 
                how you use our website.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Essential Cookies</h4>
                <p className="text-slate-600 text-sm">
                  Required for basic website functionality, shopping cart, and secure checkout process.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Analytics Cookies</h4>
                <p className="text-slate-600 text-sm">
                  Help us understand website usage and improve our service (Google Analytics, etc.).
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-slate-800 mb-2">Marketing Cookies</h4>
                <p className="text-slate-600 text-sm">
                  Used to show relevant advertisements and measure campaign effectiveness.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
              <h4 className="font-semibold text-amber-800 mb-2">Cookie Control</h4>
              <p className="text-amber-700 text-sm">
                You can control cookies through your browser settings. However, disabling essential cookies 
                may affect website functionality and your ability to make purchases.
              </p>
            </div>
          </div>
        </div>

        {/* Data Retention & International */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Data Retention & International Transfers</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">How Long We Keep Your Data</h3>
              <div className="space-y-3 text-slate-600">
                <p><strong>Account Information:</strong> Until you delete your account</p>
                <p><strong>Order History:</strong> 7 years for tax and legal compliance</p>
                <p><strong>Support Communications:</strong> 3 years from last interaction</p>
                <p><strong>Marketing Data:</strong> Until you unsubscribe</p>
                <p><strong>Website Analytics:</strong> 24 months maximum</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">International Customers</h3>
              <div className="space-y-3 text-slate-600">
                <p>
                  {storeName} is based in the United States. If you&#39;re shopping from outside the US, 
                  your information may be transferred to and processed in the United States.
                </p>
                <p>
                  We ensure appropriate safeguards are in place to protect your data during international 
                  transfers, in compliance with applicable privacy laws.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Updates & Contact */}
        <div className=" rounded-xl p-8 text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Questions About Our Privacy Policy?</h3>
            <p className="text-green-100 mb-6 mx-auto">
              We're committed to transparency about how we handle your personal information. 
              If you have any questions or concerns, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href={`mailto:${storeEmail}`} 
                className="inline-flex items-center bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                <Mail className="w-5 h-5 mr-2" />
                Contact Privacy Team
              </a>
              <div className="text-black text-sm">
                Response time: Within 48 hours
              </div>
            </div>
          </div>
        </div>

        {/* Policy Updates Notice */}
        <div className="mt-8 bg-slate-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-slate-600" />
            Policy Updates
          </h3>
          <p className="text-slate-600 text-sm">
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
            We'll notify you of significant changes by email or through a notice on our website. The "Last Updated" date 
            at the top of this policy indicates when the most recent changes were made.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;