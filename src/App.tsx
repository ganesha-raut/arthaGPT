import { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { SettingsModal } from './components/chat/SettingsModal';
import { PromptLibraryModal } from './components/chat/PromptLibraryModal';
import { CodeSandboxModal } from './components/chat/CodeSandboxModal';
import { ImageStudio } from './components/chat/ImageStudio';
import { LandingPage } from './components/landing/LandingPage';
import { useChatStore, PERSONAS } from './store/chatStore';
import { db } from './database/db';
import { Attachment } from './types';
import { buildContext, processMemoryMarkers } from './utils/contextEngine';
import { estimateTokens } from './utils/tokenizer';

export default function App() {
  const {
    activeChatId,
    setActiveChatId,
    activeModel,
    systemPrompt,
    userBio,
    temperature,
    pinnedInstructions,
    setStreaming,
    abortController,
    setAbortController,
    loadSettings,
    setCurrentInput,
    setSelectedTemplate,
    activePersonaId,
    isImageStudioOpen,
    setImageStudioOpen,
    isSidebarOpen,
    setSidebarOpen,
    isWebSearchActive,
  } = useChatStore();

  // Resolve active persona system prompt
  const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];
  const effectiveSystemPrompt = activePersona.systemPrompt || systemPrompt;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'chat'>('home');

  // Handle client-side routing and redirects (e.g. /admin -> /home)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        window.history.replaceState({}, '', '/home');
        setCurrentView('home');
      } else if (path === '/chat') {
        setCurrentView('chat');
      } else {
        // default route to /home
        if (path === '/' || path === '') {
          window.history.replaceState({}, '', '/home');
        }
        setCurrentView('home');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Control body scroll state depending on current view (landing/home is scrollable, chat is viewport-locked)
  useEffect(() => {
    if (currentView === 'home') {
      document.body.classList.remove('overflow-hidden');
    } else {
      document.body.classList.add('overflow-hidden');
    }
  }, [currentView]);

  // Monitor screen width to safely enable/disable mobile drawers and backdrop blockers
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load preferences from IndexedDB on startup
  useEffect(() => {
    loadSettings();
    const selectLatestChat = async () => {
      const latest = await db.chats.orderBy('updatedAt').reverse().first();
      if (latest) setActiveChatId(latest.id);
    };
    selectLatestChat();
  }, [loadSettings, setActiveChatId]);

  // Generate chat title from first prompt
  const handleTitleGeneration = async (chatId: string, promptText: string) => {
    // Only generate title if it's currently 'New Chat'
    const chat = await db.chats.get(chatId);
    if (!chat || chat.title !== 'New Chat') return;

    const words = promptText.trim().split(/\s+/);
    const fallbackTitle = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    await db.chats.update(chatId, { title: fallbackTitle, updatedAt: Date.now() });

    try {
      const response = await fetch('/.netlify/functions/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          await db.chats.update(chatId, {
            title: data.title.replace(/^[\"']|[\"']$/g, '').trim(),
            updatedAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.warn('Title generation failed:', err);
    }
  };

  // Helper to fetch image URL and convert it to local persistent Base64 data URI
  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Base64 conversion failed, falling back to URL:', e);
      return url;
    }
  };

  // Image generation helper
  const triggerImageGeneration = async (chatId: string, imagePrompt: string) => {
    const imgMessageId = `msg-${Math.random().toString(36).substring(2, 11)}`;
    await db.messages.add({
      id: imgMessageId,
      chatId,
      role: 'assistant',
      content: `🎨 *Generating image for:* **"${imagePrompt}"**...`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'sending',
      model: 'DALL-E-3'
    });

    try {
      const response = await fetch('/.netlify/functions/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt })
      });
      if (!response.ok) throw new Error('Image generation failed');
      const data = await response.json();
      if (data.status === 'success' && data.imageUrl) {
        // Use data.imageDataUri directly
        const localBase64 = data.imageDataUri || await getBase64FromUrl(data.imageUrl);
        await db.messages.update(imgMessageId, {
          content: `Here is your generated image: 🎨\n\n![${imagePrompt}](${localBase64})`,
          status: 'success',
          updatedAt: Date.now()
        });
      } else {
        throw new Error(data.error || 'No image URL returned');
      }
    } catch (err: any) {
      await db.messages.update(imgMessageId, {
        content: `❌ Failed to generate image: ${err.message}`,
        status: 'failed',
        updatedAt: Date.now()
      });
    }
  };

  // Main AI response generator — clean, no streaming, no canvas
  const triggerGeneration = async (chatId: string, userPrompt: string, appendToMessageId?: string) => {
    setStreaming(true);
    const controller = new AbortController();
    setAbortController(controller);

    let assistantMessageId = appendToMessageId;

    if (!assistantMessageId) {
      assistantMessageId = `msg-${Math.random().toString(36).substring(2, 11)}`;
      await db.messages.add({
        id: assistantMessageId,
        chatId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'streaming',
        model: activeModel,
      });
    }

    let searchResults = '';
    
    // Fetch DuckDuckGo search results if search option is active (with 3.5s timeout protection)
    if (isWebSearchActive) {
      try {
        const searchController = new AbortController();
        const timeoutId = setTimeout(() => searchController.abort(), 8000);

        const searchRes = await fetch(`/.netlify/functions/web-search?q=${encodeURIComponent(userPrompt)}`, {
          signal: searchController.signal
        });
        clearTimeout(timeoutId);

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results) {
            searchResults = searchData.results;
          }
        }
      } catch (err) {
        console.warn('Web search fetch error or timeout:', err);
      }
    }

    let youtubeTranscript = '';
    const ytMatch = userPrompt.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_\-]{11})/i);
    
    // Fetch YouTube transcript if a video link is present (with 4s timeout protection)
    if (ytMatch && ytMatch[1]) {
      try {
        const ytController = new AbortController();
        const timeoutId = setTimeout(() => ytController.abort(), 4000);

        const ytRes = await fetch(`/.netlify/functions/youtube-transcript?v=${ytMatch[1]}`, {
          signal: ytController.signal
        });
        clearTimeout(timeoutId);

        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData.transcript) {
            youtubeTranscript = ytData.transcript;
          }
        }
      } catch (err) {
        console.warn('YouTube transcript fetch error or timeout:', err);
      }
    }

    const promptWithSearch = (searchResults || youtubeTranscript)
      ? `${searchResults ? `[WEB SEARCH RESULTS]:\n${searchResults}\n\n` : ''}${youtubeTranscript ? `[YOUTUBE VIDEO TRANSCRIPT]:\n${youtubeTranscript}\n\n` : ''}User Question: ${userPrompt}`
      : userPrompt;

    const startTime = Date.now();

    try {
      const context = await buildContext(chatId, promptWithSearch, effectiveSystemPrompt, userBio, pinnedInstructions);

      const apiStartTime = Date.now();
      let fullResponseText = '';

      // Try Groq directly (non-streaming, instant)
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ''}`
          },
          body: JSON.stringify({
            model: activeModel,
            messages: context.messages,
            temperature,
            max_tokens: 4096,
            stream: false
          }),
          signal: controller.signal
        });

        if (!response.ok) throw new Error(`Groq status: ${response.status}`);
        const data = await response.json();
        fullResponseText = data.choices?.[0]?.message?.content || '';
      } catch (directErr) {
        if (controller.signal.aborted) throw new Error('Aborted');
        console.warn('Groq direct failed, trying Netlify fallback:', directErr);

        // Fallback: Netlify serverless function
        const fallbackResponse = await fetch('/.netlify/functions/generate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptWithSearch,
            history: context.messages.filter(m => m.role !== 'system').slice(0, -1),
            personalData: userBio,
            dataset: context.memoriesStr
          }),
          signal: controller.signal
        });

        if (!fallbackResponse.ok) throw new Error(`Netlify status: ${fallbackResponse.status}`);
        const data = await fallbackResponse.json();
        fullResponseText = data.text || '';
        if (!fullResponseText) throw new Error('Empty response from server');
      }

      const apiEndTime = Date.now();
      const apiCallDuration = apiEndTime - apiStartTime;

      // Target duration: exactly 30% of generation time, bounded between 300ms and 1500ms to remain rapid
      const targetDuration = Math.max(300, Math.min(1500, apiCallDuration * 0.3));

      const cleanedText = await processMemoryMarkers(fullResponseText);
      const words = cleanedText.split(' ');
      
      let accumulated = '';
      const isLongOrCode = cleanedText.length > 500 || cleanedText.includes('```');

      if (isLongOrCode) {
        // Write immediately in one single batch to prevent UI lag on heavy code/markdown rendering!
        await db.messages.update(assistantMessageId, {
          content: cleanedText,
          updatedAt: Date.now()
        });
      } else {
        // Light animation for short conversational answers
        const totalUpdates = Math.min(words.length, 8);
        const wordsPerUpdate = Math.max(1, Math.ceil(words.length / totalUpdates));
        const delayPerUpdate = Math.max(25, Math.floor(targetDuration / totalUpdates));

        for (let i = 0; i < words.length; i += wordsPerUpdate) {
          if (controller.signal.aborted) break;

          // If tab is hidden, write everything instantly and break
          if (document.hidden) {
            accumulated = cleanedText;
            await db.messages.update(assistantMessageId, {
              content: accumulated,
              updatedAt: Date.now()
            });
            break;
          }

          const chunk = words.slice(i, i + wordsPerUpdate).join(' ');
          accumulated += (accumulated ? ' ' : '') + chunk;

          await db.messages.update(assistantMessageId, {
            content: accumulated,
            updatedAt: Date.now()
          });
          
          await new Promise(r => setTimeout(r, delayPerUpdate));
        }
      }

      const generationTime = Date.now() - startTime;
      const tokenCount = estimateTokens(cleanedText);

      // Parse structured sources from search output (handles fallback structures and title-less entries)
      const sources: { title: string, url: string }[] = [];
      if (searchResults) {
        const blocks = searchResults.split(/-\s+\*\*(?:Title|Link)\*\*/gi);
        blocks.forEach(block => {
          if (!block.trim()) return;
          const linkMatch = block.match(/\*\*Link\*\*:\s*(https?:\/\/[^\s\n\)\*\#]+)/i) || block.match(/(https?:\/\/[^\s\n\)\*\#]+)/i);
          const titleMatch = block.match(/^:\s*([^\n]+)/i) || block.match(/Title\*\*:\s*([^\n]+)/i);
          if (linkMatch && linkMatch[1]) {
            const url = linkMatch[1].trim().replace(/[)*.]$/, '');
            if (!sources.some(s => s.url === url)) {
              let title = '';
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].replace(/\*\*|Link:|Snippet:/gi, '').trim().replace(/^:\s*/, '');
              }
              if (!title) {
                try {
                  title = new URL(url).hostname.replace('www.', '');
                } catch(e) {
                  title = 'Web Link';
                }
              }
              sources.push({ title, url });
            }
          }
        });
      }

      // Finalize message status after streaming
      await db.messages.update(assistantMessageId, {
        content: cleanedText,
        status: 'success',
        generationTime,
        tokenCount,
        metadata: { sources },
        updatedAt: Date.now()
      });

      // Check for image generation trigger (excluding markdown code blocks to avoid false triggers)
      const textWithoutCode = cleanedText.replace(/```[\s\S]*?```/g, '');
      if (textWithoutCode.includes('GENERATE_IMAGE:')) {
        const imageMatch = textWithoutCode.match(/GENERATE_IMAGE:\s*(.+)$/m);
        if (imageMatch?.[1]) {
          triggerImageGeneration(chatId, imageMatch[1].trim());
        }
      }

    } catch (err: any) {
      const isAborted = controller.signal.aborted || err.message === 'Aborted';
      const existingMsg = await db.messages.get(assistantMessageId);
      await db.messages.update(assistantMessageId, {
        content: isAborted
          ? (existingMsg?.content || 'Generation cancelled.')
          : `❌ Failed to get a response. Please check your API key or internet connection.\n\n*Error: ${err.message}*`,
        status: isAborted ? 'success' : 'failed',
        updatedAt: Date.now()
      });
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  };

  const handleSendMessage = async (content: string, attachments: Attachment[]) => {
    if (!activeChatId) return;
    const now = Date.now();
    const userMessageId = `msg-${Math.random().toString(36).substring(2, 11)}`;
    const isDirectImagePrompt = 
      (/\b(image|photo|picture|art|logo|poster|banner|drawing|illustration|sketch|portrait|painting|avatar|cartoon|gfx|फोटो|इमेज|चित्र)\b/i.test(content) &&
       /\b(generate|create|draw|make|show|render|paint|design|काढ|बनव|दाखव)\b/i.test(content)) ||
      /\b(draw|paint|sketch|design|काढ|चित्रित)\b/i.test(content);

    await db.messages.add({
      id: userMessageId,
      chatId: activeChatId,
      role: 'user',
      content,
      createdAt: now,
      updatedAt: now,
      status: 'success',
      attachments
    });

    await db.chats.update(activeChatId, { updatedAt: now });

    // Generate title once the user enters a meaningful query (skip simple greetings)
    const chat = await db.chats.get(activeChatId);
    if (chat && chat.title === 'New Chat') {
      const isGreeting = /^(hello|hi|hey|yo|hola|greetings|good morning|good afternoon|good evening|hello ganesh|hi ganesh|hello astra|hi astra|astra|ganesh|test|hi there|hello there)\b/i.test(content.trim());
      if (!isGreeting) {
        handleTitleGeneration(activeChatId, content);
      }
    }

    // For explicit image prompts, generate directly in chat so result appears in the same conversation flow.
    if (isDirectImagePrompt) {
      await triggerImageGeneration(activeChatId, content);
      return;
    }

    await triggerGeneration(activeChatId, content);
  };

  const handleStopGeneration = () => {
    abortController?.abort();
  };

  const handleRetryFailed = async (failedMessageId: string) => {
    if (!activeChatId) return;
    await db.messages.delete(failedMessageId);
    const remaining = await db.messages.where('chatId').equals(activeChatId).sortBy('createdAt');
    const lastUserMsg = [...remaining].reverse().find(m => m.role === 'user');
    if (lastUserMsg) await triggerGeneration(activeChatId, lastUserMsg.content);
  };

  if (currentView === 'home') {
    return (
      <LandingPage 
        onGetStarted={() => {
          window.history.pushState({}, '', '/chat');
          setCurrentView('chat');
        }} 
      />
    );
  }

  return (
    <div className="w-screen h-screen flex bg-zinc-950 text-zinc-100 overflow-hidden font-sans relative">
      {/* Backdrop for mobile sidebar - only rendered on mobile screens to prevent blocking desktop clicks */}
      {isSidebarOpen && isMobile && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25 cursor-pointer"
        />
      )}

      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        currentView={currentView}
        onViewChange={(view) => {
          window.history.pushState({}, '', '/' + view);
          setCurrentView(view);
        }}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <ChatArea
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onRetryFailed={handleRetryFailed}
        />
        
        {/* Backdrop for mobile ImageStudio - only rendered on mobile screens to prevent blocking desktop clicks */}
        {isImageStudioOpen && activeChatId && isMobile && (
          <div 
            onClick={() => setImageStudioOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-25 cursor-pointer"
          />
        )}

        {isImageStudioOpen && activeChatId && (
          <ImageStudio onClose={() => setImageStudioOpen(false)} />
        )}
      </div>


      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <PromptLibraryModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={(prompt) => {
          setCurrentInput(prompt);
          setSelectedTemplate({
            id: 'loaded',
            name: 'Selected Template',
            description: '',
            content: prompt,
            createdAt: Date.now()
          });
        }}
      />
      <CodeSandboxModal />
    </div>
  );
}
