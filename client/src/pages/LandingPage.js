import React from 'react';
import Navigationbar from '../components/NavigationBar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import GetStarted from '../components/GetStarted';
import Testimonials from '../components/Testimonials';
import PremiumPlans from '../components/PremiumPlans';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';
import "../styles/landing-page.module.css";

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navigationbar />
      <Hero />
      <Features />
      <GetStarted />
      <Testimonials />
      <PremiumPlans />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;