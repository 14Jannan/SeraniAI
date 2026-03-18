import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const Landing = () => {
    
    // Feature data for the cards
    const features = [
        { name: 'Journal', description: 'Keep track of your thoughts and ideas with AI-powered journaling that learns from your writing style.' },
        { name: 'AI Chat', description: 'Access personalized learning paths and courses tailored to your goals and learning pace.' },
        { name: 'Course', description: 'Have natural conversations with Serani AI to get answers, brainstorm, or just chat.' },
        { name: 'Calendar', description: 'Smart scheduling that adapts to your routine and helps you stay organized effortlessly.' },
    ];

    return (
        <div className="bg-gradient-to-b from-[#E0E7FF] to-white font-sans">
            {/* Header/Navbar */}
            <header className="absolute top-0 left-0 w-full z-10 py-6 px-4 sm:px-10">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-slate-800">SeraniAI</h1>
                    <div className="space-x-4">
                        <Link to="/login" className="px-5 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition">
                            Login
                        </Link>
                        <Link to="/register" className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition">
                            Sign Up
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-32 pb-20">
                <div className="container mx-auto px-4 sm:px-10 text-center md:text-left">
                    <div className="grid md:grid-cols-2 gap-10 items-center">
                        {/* Left Side: Text Content */}
                        <div className="animate-fade-in-up">
                            <h1 className="text-5xl sm:text-7xl font-extrabold text-slate-900 leading-tight">
                                Meet <span className="text-green-500">SeraniAI</span>
                                <br />
                                Your Smart Companion
                            </h1>
                            <p className="mt-6 text-lg text-slate-600 max-w-lg mx-auto md:mx-0">
                                Serani AI brings the power of modern artificial intelligence into one smart system. With cutting-edge technology and adaptive learning, Serani AI is built for the future.
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <Link to="/register" className="flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-white bg-purple-600 rounded-xl shadow-lg hover:bg-purple-700 transform hover:-translate-y-1 transition-all">
                                    START NOW <FiArrowRight />
                                </Link>
                                <button className="px-8 py-4 text-lg font-bold text-slate-800 bg-slate-200 rounded-xl shadow-lg hover:bg-slate-300 transform hover:-translate-y-1 transition-all">
                                    Learn More
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Robot Image */}
                        <div className="flex flex-col items-center justify-center animate-fade-in">
                            <img 
                                src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" 
                                alt="Serani AI Robot"
                                className="w-80 h-80 drop-shadow-2xl animate-bounce-slow"
                            />
                            <h2 className="text-4xl font-bold text-slate-900 mt-2">SeraniAI</h2>
                            <p className="text-slate-500">AI-powered virtual assistant</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-10 text-center">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900">
                        Everything You Need, <span className="text-blue-600">All in One Place</span>
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
                        Discover the powerful features that make SeraniAI your ultimate AI companion for productivity and growth.
                    </p>
                    <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature) => (
                            <div key={feature.name} className="bg-[#FFF1F2] p-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-transform duration-300 text-left">
                                <h3 className="text-2xl font-bold text-slate-800">{feature.name}</h3>
                                <p className="mt-3 text-slate-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;

