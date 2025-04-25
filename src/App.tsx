import React from 'react';
import Header from './components/Header';
import GameBoard from './components/GameBoard';
import Footer from './components/Footer';
import './index.css';

function App() {
  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      <Header />
      <main className="flex-grow container mx-auto px-4 pt-2 md:pt-4">
        <GameBoard />
      </main>
      <Footer />
    </div>
  );
}

export default App;