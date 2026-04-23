"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Story } from "@/components/sections/Story";
import { Manifesto } from "@/components/sections/Manifesto";
import { Tokenomics } from "@/components/sections/Tokenomics";
import { Roadmap } from "@/components/sections/Roadmap";
import { Security } from "@/components/sections/Security";
import { Community } from "@/components/sections/Community";

export function HomeView() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Story />
        <Manifesto />
        <Tokenomics />
        <Roadmap />
        <Security />
        <Community />
      </main>
      <Footer />
    </>
  );
}
