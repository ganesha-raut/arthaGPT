import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, MessageSquare, Code, FileText, Image as ImageIcon, 
  BarChart2, Search, Cpu, Zap, ArrowRight, Github, 
  Linkedin, ExternalLink, CheckCircle2
} from 'lucide-react';
import arthaLogo from '../../assets/arthagpt.png';
import founderImage from '../../assets/ganesharaut.jpg';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const handleLogoFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/favicon-32x32.png';
  };

  const features = [
    {
      icon: <MessageSquare className="w-5 h-5 text-[#17C7C9]" />,
      title: "AI Chat",
      desc: "Generate human-quality, context-aware conversations and natural dialogs."
    },
    {
      icon: <Code className="w-5 h-5 text-[#F5B335]" />,
      title: "Code Assistant",
      desc: "Generate complete code blocks, debug syntax errors, and explain code logic in detail."
    },
    {
      icon: <FileText className="w-5 h-5 text-purple-400" />,
      title: "Document Generator",
      desc: "Quickly generate professional resumes, business proposals, academic reports, and more."
    },
    {
      icon: <ImageIcon className="w-5 h-5 text-[#17C7C9]" />,
      title: "AI Image Generation",
      desc: "Turn textual descriptions into high-fidelity custom images and artwork instantly."
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-emerald-400" />,
      title: "Data Analysis",
      desc: "Upload CSV, Excel, or PDF sheets and extract powerful data insights and structures."
    },
    {
      icon: <Search className="w-5 h-5 text-amber-400" />,
      title: "Deep Research",
      desc: "Search the live web and compile comprehensive, sourced information on any topic."
    },
    {
      icon: <Cpu className="w-5 h-5 text-[#F5B335]" />,
      title: "AI Agents",
      desc: "Deploy autonomous workflows and background tasks to automate repetitive processes."
    },
    {
      icon: <Zap className="w-5 h-5 text-rose-450" />,
      title: "Lightning Fast",
      desc: "Fully optimized performance ensuring sub-second response render times."
    }
  ];

  const whyUs = [
    { title: "Smart AI", desc: "Powered by highly optimized Llama-3.1 intelligence." },
    { title: "Privacy First", desc: "All conversations and files are kept 100% private." },
    { title: "Multiple AI Models", desc: "Select and switch between models to fit your tasks." },
    { title: "Fast Responses", desc: "Optimized database batches remove annoying UI lag." },
    { title: "Professional UI", desc: "Clean layout inspired by Apple and Vercel dashboards." },
    { title: "Cross Platform", desc: "Responsive layout runs smoothly on all mobile devices." }
  ];

  const faqs = [
    {
      q: "What is Artha GPT?",
      a: "Artha GPT is a premium, local-first artificial intelligence workspace. It allows you to chat, write code, run live previews in a sandbox, research the web, and generate images in a private and secure browser sandbox."
    },
    {
      q: "Is my data secure?",
      a: "Yes, 100%. Artha GPT runs local database stores using Dexie.js inside your browser. No message histories or profile configurations are sent to external cloud databases."
    },
    {
      q: "Can I generate and run code?",
      a: "Absolutely! Artha GPT generates complete code blocks. You can run code, preview React, HTML, CSS, and JS projects inside the built-in Sandbox preview modal with a single click."
    },
    {
      q: "Can I upload files?",
      a: "Yes! You can load files, code, and CSVs into the app to help you analyze, search, or process information."
    },
    {
      q: "Which AI models are supported?",
      a: "By default, Artha GPT uses Groq's high-speed Llama-3.1 models for instant, smart, and comprehensive responses."
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#000000] text-zinc-100 font-sans selection:bg-[#17C7C9]/30 selection:text-white overflow-x-hidden relative scroll-smooth">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0c0e_1px,transparent_1px),linear-gradient(to_bottom,#0c0c0e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 pointer-events-none" />

      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#17C7C9]/8 blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute top-[25%] right-1/4 w-[700px] h-[700px] rounded-full bg-[#F5B335]/4 blur-[160px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[20%] left-1/3 w-[500px] h-[500px] rounded-full bg-[#17C7C9]/5 blur-[130px] -z-10 pointer-events-none" />

      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/60 backdrop-blur-lg transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={arthaLogo} onError={handleLogoFallback} className="w-8 h-8 rounded-full object-cover border border-[#17C7C9]/40 shadow-lg shadow-[#17C7C9]/10" alt="Artha GPT Logo" />
            <span className="font-bold text-lg tracking-tight text-white">Artha GPT</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#why-us" className="hover:text-white transition-colors">Why Us</a>
            <a href="#founder" className="hover:text-white transition-colors">Founder</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <button 
              onClick={onGetStarted}
              className="px-4 py-2 bg-[#17C7C9] hover:bg-[#15b0b2] text-black font-bold text-sm rounded-xl transition-all shadow-md shadow-[#17C7C9]/15 hover:scale-102 active:scale-98 cursor-pointer border-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:py-36 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center relative">
        <div className="lg:col-span-7 space-y-7 text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#17C7C9]/35 bg-[#17C7C9]/10 text-xs font-semibold text-[#17C7C9] select-none shadow-sm shadow-[#17C7C9]/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Artha GPT Platform v1.0</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Artha GPT
            <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-[#17C7C9] via-[#F5B335] to-[#17C7C9] bg-size-200 animate-gradient">
              One AI Platform for Everything.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-xl leading-relaxed">
            Chat, Code, Research, Create Images, Analyze Files, Generate Documents, Automate Tasks, and build AI workflows using one powerful AI assistant.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={onGetStarted}
              className="px-8 py-3.5 bg-[#17C7C9] hover:bg-[#15b0b2] text-black font-extrabold rounded-xl flex items-center gap-2.5 transition-all shadow-lg shadow-[#17C7C9]/20 hover:scale-102 active:scale-98 cursor-pointer border-0"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
            <a 
              href="#features"
              className="px-8 py-3.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-semibold rounded-xl transition-all hover:scale-102 active:scale-98 text-center decoration-none"
            >
              Learn More
            </a>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center items-center relative select-none">
          <div className="w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] rounded-full bg-gradient-to-tr from-[#17C7C9]/10 via-black to-[#F5B335]/5 border border-zinc-900 flex items-center justify-center relative shadow-2xl">
            <div className="absolute inset-0 border border-[#17C7C9]/10 rounded-full animate-pulse" />
            <div className="absolute inset-4 border border-dashed border-[#17C7C9]/25 rounded-full animate-spin-slow" />
            
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-black border-2 border-[#17C7C9]/85 flex items-center justify-center shadow-[0_0_50px_rgba(23,199,201,0.25)] hover:shadow-[0_0_60px_rgba(23,199,201,0.4)] transition-all duration-500 scale-100 hover:scale-105 z-10 cursor-pointer">
              <img src={arthaLogo} onError={handleLogoFallback} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover" alt="Artha GPT Hero Logo" />
            </div>

            <div className="absolute -top-[5%] -left-[12%] bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-3.5 w-60 text-left text-xs text-zinc-300 shadow-2xl flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white uppercase">U</div>
              <div>
                <p className="font-semibold text-white mb-0.5">Write a React login component...</p>
                <p className="text-[10px] text-zinc-500">2s ago</p>
              </div>
            </div>

            <div className="absolute -bottom-[5%] -right-[8%] bg-zinc-900/90 backdrop-blur-md border border-[#17C7C9]/30 rounded-2xl p-4 w-64 text-left text-xs text-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              </div>
              <div className="space-y-1 w-full">
                <p className="font-bold text-[#17C7C9]">Artha GPT</p>
                <p className="text-[9px] font-mono bg-black p-1.5 rounded-lg border border-zinc-800 text-emerald-400 truncate">export default function Login()...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950/20 py-10 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center items-center gap-8 sm:gap-16">
          {['Fast', 'Secure', 'Private', 'AI Powered', 'Modern SaaS'].map((badge) => (
            <div key={badge} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-[#17C7C9]" />
              <span>{badge}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-36 scroll-mt-16 text-center">
        <div className="max-w-3xl mx-auto space-y-4 mb-20">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Beautifully Integrated Features</h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Everything you need for full developer, creative, and business productivity in one cohesive workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat) => (
            <div 
              key={feat.title}
              className="p-6 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-2xl text-left transition-all duration-300 shadow-md group relative hover:-translate-y-1"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#17C7C9]/0 via-transparent to-[#17C7C9]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 group-hover:border-[#17C7C9]/40 transition-colors">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-xs text-zinc-550 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-t border-zinc-900 bg-zinc-950/20 py-24 sm:py-36 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-4 mb-24">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">How Artha GPT Works</h2>
            <p className="text-zinc-450 text-sm sm:text-base leading-relaxed">
              Experience simple workflows designed with Apple-inspired clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-[24%] left-[25%] right-[25%] h-0.5 border-t border-dashed border-[#17C7C9]/20 -z-10" />

            <div className="space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#17C7C9]/10 border border-[#17C7C9]/40 text-[#17C7C9] flex items-center justify-center font-bold text-lg shadow-md shadow-[#17C7C9]/5">
                01
              </div>
              <h3 className="text-base font-bold text-white">Ask anything</h3>
              <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">Type your query or instruction in normal speech.</p>
            </div>

            <div className="space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#F5B335]/10 border border-[#F5B335]/40 text-[#F5B335] flex items-center justify-center font-bold text-lg shadow-md shadow-[#F5B335]/5">
                02
              </div>
              <h3 className="text-base font-bold text-white">AI understands context</h3>
              <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">System retrieves memory keys and live web context.</p>
            </div>

            <div className="space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#17C7C9]/10 border border-[#17C7C9]/40 text-[#17C7C9] flex items-center justify-center font-bold text-lg shadow-md shadow-[#17C7C9]/5">
                03
              </div>
              <h3 className="text-base font-bold text-white">Get intelligent results</h3>
              <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">View generated text, sandboxed previews or images.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="why-us" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-36 scroll-mt-16 text-center">
        <div className="max-w-3xl mx-auto space-y-4 mb-20">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Why Artha GPT?</h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Engineered with deep focus on speed, design, and local browser encryption.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {whyUs.map((w) => (
            <div 
              key={w.title}
              className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl text-left hover:border-zinc-800 transition-all flex gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-450">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">{w.title}</h4>
                <p className="text-xs text-zinc-550 leading-relaxed">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="founder" className="border-t border-zinc-900 bg-[#020203] py-24 sm:py-36 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Meet the Founder</h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              The creative engineer behind the product.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-zinc-950 border border-zinc-900 rounded-3xl text-left shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center md:items-start max-w-3xl mx-auto backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-[#17C7C9]/10 to-[#F5B335]/15 blur-2xl pointer-events-none" />

            <div className="w-28 h-28 rounded-full border-2 border-[#17C7C9] flex-shrink-0 overflow-hidden shadow-lg shadow-[#17C7C9]/10">
              <img src={founderImage} onError={handleLogoFallback} className="w-full h-full object-cover" alt="Ganesh Santosh Raut" />
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-bold text-white">Ganesh Santosh Raut</h3>
                <p className="text-xs font-semibold text-[#F5B335] uppercase tracking-wider mt-0.5">Founder & CEO</p>
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Ganesh Santosh Raut is an AI Engineer and Full Stack Developer from Maharashtra, India.
                He founded Artha GPT with the vision of creating an intelligent AI platform that helps students, developers, creators, and businesses work smarter using Generative AI and AI Agents.
              </p>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block">Skills & Expertise</span>
                <div className="flex flex-wrap gap-1.5">
                  {['AI Engineering', 'Python', 'React', 'Next.js', 'LangChain', 'LangGraph', 'RAG', 'Full Stack Development'].map((skill) => (
                    <span key={skill} className="px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-850 rounded-lg text-[10px] font-medium text-zinc-350 select-none">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 select-none">
                <a 
                  href="https://github.com/ganeshraut" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors decoration-none"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
                <a 
                  href="https://linkedin.com/in/ganeshraut" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-3.5 py-1.5 rounded-lg bg-[#0077b5]/10 border border-[#0077b5]/20 hover:bg-[#0077b5]/20 text-xs font-semibold text-[#0077b5] flex items-center gap-1.5 transition-colors decoration-none"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
                <a 
                  href="https://ganesharaut.in" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-3.5 py-1.5 rounded-lg bg-[#17C7C9]/10 border border-[#17C7C9]/20 hover:bg-[#17C7C9]/20 text-xs font-semibold text-[#17C7C9] flex items-center gap-1.5 transition-colors decoration-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Portfolio</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 sm:p-8 bg-zinc-950 border border-zinc-900 rounded-2xl text-left">
            <span className="text-[10px] font-bold text-[#17C7C9] uppercase tracking-wider">Mission Statement</span>
            <h3 className="text-lg font-bold text-white mt-2 mb-3">Our Core Mission</h3>
            <p className="text-xs sm:text-sm text-zinc-450 leading-relaxed">
              To make Artificial Intelligence accessible, practical, and meaningful for everyone, removing technical bottlenecks and licensing limitations.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-zinc-950 border border-zinc-900 rounded-2xl text-left">
            <span className="text-[10px] font-bold text-[#F5B335] uppercase tracking-wider">Vision Statement</span>
            <h3 className="text-lg font-bold text-white mt-2 mb-3">Looking Forward</h3>
            <p className="text-xs sm:text-sm text-zinc-450 leading-relaxed">
              Build a globally trusted, local-first artificial intelligence platform from India, enabling developers and creators to shape the future securely.
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-16">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
          <p className="text-zinc-450 text-sm sm:text-base">
            Have questions? Here are immediate answers to common details.
          </p>
        </div>

        <div className="space-y-3.5 select-none">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div 
                key={index}
                className="border border-zinc-900 hover:border-zinc-800 rounded-xl bg-zinc-950/60 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-bold text-white hover:bg-zinc-900/30 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <span className="pr-4">{faq.q}</span>
                  <span className="text-zinc-400 text-xs">{isOpen ? '▼' : '▶'}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-900 pt-3 bg-black/40 select-text">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
        <div className="p-8 sm:p-16 rounded-3xl bg-gradient-to-tr from-[#17C7C9]/8 via-zinc-950 to-[#F5B335]/4 border border-zinc-900 relative overflow-hidden shadow-2xl">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#17C7C9]/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#F5B335]/5 blur-2xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5 max-w-2xl mx-auto">
            Start Building with Artha GPT Today
          </h2>
          <p className="text-zinc-450 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Launch the dashboard and experience local-first private AI conversations, direct web searches, and sandboxed previews now.
          </p>

          <button
            onClick={onGetStarted}
            className="px-8 py-3.5 bg-gradient-to-r from-[#17C7C9] to-[#15b0b2] hover:opacity-90 text-black font-extrabold rounded-xl transition-all shadow-lg shadow-[#17C7C9]/20 hover:scale-103 active:scale-97 cursor-pointer border-0"
          >
            Launch Chat
          </button>
        </div>
      </section>

      <footer className="border-t border-zinc-900 bg-zinc-950/20 py-12 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={arthaLogo} onError={handleLogoFallback} className="w-6 h-6 rounded-full object-cover" alt="Artha GPT Footer Logo" />
            <span className="font-bold text-sm tracking-tight text-white">Artha GPT</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-xs font-semibold text-zinc-550 uppercase tracking-wider">
            <a href="#" className="hover:text-zinc-300 transition-colors decoration-none">Home</a>
            <a href="#features" className="hover:text-zinc-300 transition-colors decoration-none">Features</a>
            <a href="#founder" className="hover:text-zinc-300 transition-colors decoration-none">Founder</a>
            <a href="#faq" className="hover:text-zinc-300 transition-colors decoration-none">FAQ</a>
          </div>

          <div className="text-center md:text-right space-y-1 text-xs text-zinc-500">
            <p>&copy; 2026 Artha GPT. All Rights Reserved.</p>
            <p>Built with ❤️ by <span className="text-[#17C7C9] font-semibold">Ganesh Santosh Raut</span>.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
