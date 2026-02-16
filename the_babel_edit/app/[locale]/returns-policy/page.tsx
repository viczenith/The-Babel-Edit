'use client'
import React, { useState } from 'react';
import { Calendar, Package, Shield, AlertTriangle, CheckCircle, XCircle, Mail, ArrowLeft, Clock, CreditCard, Truck } from 'lucide-react';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';

const ReturnsPolicy = () => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const returnConditions = [
    {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      title: "Unworn Condition",
      description: "Item must be in the exact same condition as when you received it - completely unworn with no signs of use."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      title: "Unwashed & Clean",
      description: "Items must not have been washed, cleaned, or altered in any way from their original state."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      title: "Original Tags Attached",
      description: "Any original tags, labels, or packaging must still be attached and intact."
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      title: "Within 15 Days",
      description: "Return request must be initiated within 15 calendar days of delivery confirmation."
    }
  ];

  const nonReturnableItems = [
    "Items returned after 15 calendar days",
    "Items that show signs of wear or use",
    "Items that have been washed or cleaned",
    "Items with removed or damaged tags",
    "Items with stains, odors, or alterations",
    "Items damaged by customer negligence"
  ];

  const returnSteps = [
    {
      step: 1,
      title: "Contact Us",
      description: "Email support@babeledit.com within 15 days with your order number and reason for return",
      icon: <Mail className="w-8 h-8" />
    },
    {
      step: 2,
      title: "Get Authorization",
      description: "We'll review your request and provide return authorization and instructions if approved",
      icon: <Shield className="w-8 h-8" />
    },
    {
      step: 3,
      title: "Package & Ship",
      description: "Carefully package the item and ship using a trackable method at your expense",
      icon: <Package className="w-8 h-8" />
    },
    {
      step: 4,
      title: "Receive Refund",
      description: "Once we receive and inspect the item, your refund will be processed within 5-7 business days",
      icon: <CreditCard className="w-8 h-8" />
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Hero Section */}
      <div className="text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <ArrowLeft className="w-16 h-16 text-amber-400" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Returns Policy</h1>
            <p className="text-xl text-stone-300 mx-auto">
              Understanding our return process for pre-loved, curated fashion pieces
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Critical Notice */}
        <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Important: Time-Sensitive Policy</h3>
              <p className="text-red-700 mb-2">
                Due to the curated and limited nature of our pre-loved pieces, we have a strict 
                <strong> 15 calendar day return window</strong> from the date of delivery.
              </p>
              <p className="text-red-600 text-sm">
                After 15 days, returns or refunds will not be accepted under any circumstances.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-stone-200">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'overview', label: 'Overview', icon: <Package className="w-5 h-5" /> },
                { id: 'process', label: 'Return Process', icon: <ArrowLeft className="w-5 h-5" /> },
                { id: 'conditions', label: 'Conditions', icon: <CheckCircle className="w-5 h-5" /> },
                { id: 'shipping', label: 'Shipping Info', icon: <Truck className="w-5 h-5" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {selectedTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">Returns Policy Overview</h2>
                  <p className="text-stone-600 text-lg leading-relaxed mb-6">
                    At The Babel Edit, we understand that sometimes items may not meet your expectations. 
                    However, due to the unique, curated nature of our pre-loved fashion pieces, we maintain 
                    a structured return policy to ensure fairness for all customers.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-amber-50 p-6 rounded-lg text-center">
                    <Calendar className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-amber-800 mb-2">15-Day Window</h3>
                    <p className="text-amber-700 text-sm">
                      Returns must be initiated within 15 calendar days of delivery
                    </p>
                  </div>
                  
                  <div className="bg-stone-50 p-6 rounded-lg text-center">
                    <Package className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-stone-800 mb-2">Original Condition</h3>
                    <p className="text-stone-700 text-sm">
                      Items must be unworn, unwashed, with original tags attached
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg text-center">
                    <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-blue-800 mb-2">Quality Assured</h3>
                    <p className="text-blue-700 text-sm">
                      All items are pre-authenticated and quality checked before shipping
                    </p>
                  </div>
                </div>

                <div className="bg-stone-100 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-stone-800 mb-3">What You Need to Know</h3>
                  <ul className="space-y-2 text-stone-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      Shipping costs are non-refundable
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      Return shipping is customer's responsibility
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      Refunds processed within 5-7 business days of receipt
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      Items inspected upon return for condition verification
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Return Process Tab */}
            {selectedTab === 'process' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">Step-by-Step Return Process</h2>
                  <p className="text-stone-600 mb-8">
                    Follow these steps to ensure your return is processed smoothly and efficiently.
                  </p>
                </div>

                <div className="space-y-6">
                  {returnSteps.map((step, index) => (
                    <div key={step.step} className="flex items-start space-x-6 p-6 bg-stone-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold text-lg">
                          {step.step}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center mb-2">
                          <div className="text-stone-600 mr-3">
                            {step.icon}
                          </div>
                          <h3 className="text-lg font-semibold text-stone-800">{step.title}</h3>
                        </div>
                        <p className="text-stone-600">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-400">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">Contact Information</h3>
                  <div className="flex items-center space-x-4">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-blue-800 font-medium">Email Support</p>
                      <a href="mailto:support@babeledit.com" className="text-blue-600 hover:text-blue-800 transition-colors">
                        support@babeledit.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conditions Tab */}
            {selectedTab === 'conditions' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">Return Conditions</h2>
                  <p className="text-stone-600 mb-8">
                    To ensure the integrity of our curated collection, returned items must meet all of the following conditions.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {returnConditions.map((condition, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      {condition.icon}
                      <div>
                        <h3 className="font-semibold text-green-800 mb-1">{condition.title}</h3>
                        <p className="text-green-700 text-sm">{condition.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                    <XCircle className="w-6 h-6 mr-2" />
                    Non-Returnable Items
                  </h3>
                  <p className="text-red-700 mb-4">The following items cannot be returned:</p>
                  <ul className="space-y-2">
                    {nonReturnableItems.map((item, index) => (
                      <li key={index} className="flex items-start text-red-700">
                        <XCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 p-6 rounded-lg border-l-4 border-amber-400">
                  <h3 className="text-lg font-semibold text-amber-800 mb-3">Understanding Pre-Loved Fashion</h3>
                  <p className="text-amber-700">
                    All items sold by The Babel Edit are pre-owned and may show minor signs of wear consistent 
                    with their vintage or secondhand nature. Any significant flaws are disclosed in the product 
                    description. By purchasing, you acknowledge and accept this characteristic of pre-loved fashion.
                  </p>
                </div>
              </div>
            )}

            {/* Shipping Info Tab */}
            {selectedTab === 'shipping' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-stone-800 mb-4">Shipping & Return Information</h2>
                  <p className="text-stone-600 mb-8">
                    Important details about shipping costs, methods, and responsibilities for returns.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-stone-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
                        <Truck className="w-6 h-6 mr-2 text-stone-600" />
                        Return Shipping
                      </h3>
                      <ul className="space-y-3 text-stone-700">
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          Customer is responsible for return shipping costs
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          Use a trackable shipping method
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          We recommend insurance for valuable items
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          Package items securely to prevent damage
                        </li>
                      </ul>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                        <Clock className="w-6 h-6 mr-2 text-amber-600" />
                        Processing Times
                      </h3>
                      <ul className="space-y-2 text-amber-700">
                        <li><strong>Return Authorization:</strong> 1-2 business days</li>
                        <li><strong>Item Inspection:</strong> 2-3 business days after receipt</li>
                        <li><strong>Refund Processing:</strong> 5-7 business days</li>
                        <li><strong>Total Time:</strong> 8-12 business days from return initiation</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                        <CreditCard className="w-6 h-6 mr-2 text-blue-600" />
                        Refund Information
                      </h3>
                      <ul className="space-y-3 text-blue-700">
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          Refunds issued to original payment method
                        </li>
                        <li className="flex items-start">
                          <XCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                          Original shipping costs are non-refundable
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          Full item price refunded (minus shipping)
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          Email confirmation sent when refund is processed
                        </li>
                      </ul>
                    </div>

                    <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                      <h3 className="text-lg font-semibold text-red-800 mb-3">Important Notes</h3>
                      <ul className="space-y-2 text-red-700 text-sm">
                        <li>• Customer assumes risk of loss during return shipping</li>
                        <li>• Damaged returns may result in partial or no refund</li>
                        <li>• Return authorization must be obtained before shipping</li>
                        <li>• Items shipped without authorization may not be processed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className=" rounded-xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Questions About Returns?</h3>
          <p className="text-amber-100 mb-6 mx-auto">
            Our customer support team is here to help guide you through the return process 
            and answer any questions you may have.
          </p>
          <a 
            href="mailto:support@babeledit.com" 
            className="inline-flex items-center bg-white text-amber-600 px-8 py-3 rounded-lg font-semibold hover:bg-amber-50 transition-colors"
          >
            <Mail className="w-5 h-5 mr-2" />
            Contact Support
          </a>
          <p className="text-amber-200 text-sm mt-4">
            Response time: Within 24-48 hours
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ReturnsPolicy;