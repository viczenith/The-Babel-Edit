import Footer from '@/app/components/features/Footer/Footer'
import Navbar from '@/app/components/features/Navbar/Navbar'
import TermsAndConditions from '@/app/components/features/TermsCondition/TermsCondition'
import React from 'react'

function page() {
  return (
    <div>
        <Navbar />
        <TermsAndConditions />
        <Footer />
    </div>
  )
}

export default page