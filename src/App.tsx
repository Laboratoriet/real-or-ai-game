import React from 'react';
import Header from './components/Header';
import GameBoard from './components/GameBoard';
import RealOrAiArticle from './components/RealOrAiArticle';
import Footer from './components/Footer';
import { Analytics } from "@vercel/analytics/react"
import './index.css';

function App() {
  const isRealOrAiPage = window.location.pathname.includes('/realorai');

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      <Header />
      <main className="flex-grow container mx-auto px-4 pt-2 md:pt-4 min-h-0 overflow-y-auto">
        {isRealOrAiPage ? <RealOrAiArticle /> : <GameBoard />}
      </main>
      <Footer />
      <Analytics />
    </div>
  );
}

export default App;