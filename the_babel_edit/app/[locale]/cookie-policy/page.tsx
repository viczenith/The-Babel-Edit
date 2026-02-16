'use client'

import React from 'react';
import { Shield, Cookie, Globe, Settings, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';

const CookiePolicy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header Section */}
      <div className="text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Cookie className="w-16 h-16 text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-xl text-slate-300 mx-auto">
              Learn how we use cookies and similar technologies to provide you with the best experience.
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Last updated: August 3, 2025
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Introduction */}
        <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Our Commitment</h3>
              <p className="text-green-700">
                At The Babel Edit, we use cookies responsibly to enhance your shopping experience, 
                improve our website, and deliver relevant content. We respect your privacy and give you 
                control over your cookie preferences.
              </p>
            </div>
          </div>
        </div>

        {/* What Are Cookies */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <FileText className="w-7 h-7 mr-3 text-slate-600" />
            What Are Cookies?
          </h2>
          <p className="text-slate-600 mb-4">
            Cookies are small text files placed on your device when you visit a website. They help us 
            remember your preferences, keep you logged in, analyze website traffic, and show you 
            relevant offers. Some cookies are essential, while others are optional.
          </p>
        </div>

        {/* Types of Cookies */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Cookie className="w-7 h-7 mr-3 text-slate-600" />
            Types of Cookies We Use
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Essential Cookies</h3>
              <p className="text-slate-600 text-sm">
                Required for core site functionality, such as logging in, shopping cart, and secure checkout.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Functional Cookies</h3>
              <p className="text-slate-600 text-sm">
                Remember your preferences (like language and location) and personalize your experience.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Analytics Cookies</h3>
              <p className="text-slate-600 text-sm">
                Help us understand website usage, improve performance, and optimize features.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Marketing Cookies</h3>
              <p className="text-slate-600 text-sm">
                Show personalized ads, track campaign performance, and recommend relevant products.
              </p>
            </div>
          </div>
        </div>

        {/* Managing Cookies */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Settings className="w-7 h-7 mr-3 text-slate-600" />
            Managing Cookies
          </h2>
          <p className="text-slate-600 mb-4">
            You can manage or disable cookies through your browser settings. Please note that disabling 
            essential cookies may limit core site functionality, including checkout and login features.
          </p>
          <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
            <h4 className="font-semibold text-amber-800 mb-2">Your Choices</h4>
            <p className="text-amber-700 text-sm">
              Most browsers allow you to block or delete cookies. You can also set preferences for 
              how cookies are used. For more details, refer to your browser’s help section.
            </p>
          </div>
        </div>

        {/* Third Party Cookies */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
            <Globe className="w-7 h-7 mr-3 text-slate-600" />
            Third-Party Cookies
          </h2>
          <p className="text-slate-600">
            We may use trusted third-party services (such as Google Analytics, Facebook Pixel, or ad 
            networks) that set cookies on our behalf. These help us analyze performance and deliver 
            tailored marketing. We do not control third-party cookies and recommend reviewing their 
            privacy policies for more information.
          </p>
        </div>

        {/* Updates & Contact */}
        <div className="rounded-xl p-8 text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Questions About Our Cookie Policy?</h3>
            <p className="text-green-100 mb-6 mx-auto">
              If you have any questions about how we use cookies or want to update your preferences, 
              please reach out to us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="mailto:support@babeledit.com" 
                className="inline-flex items-center bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Contact Support
              </a>
              <div className="text-black text-sm">
                Response time: Within 48 hours
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-slate-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-slate-600" />
            Policy Updates
          </h3>
          <p className="text-slate-600 text-sm">
            We may update this Cookie Policy from time to time. Any updates will be posted on this page, 
            and significant changes may also be communicated via email or a notice on our website.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
