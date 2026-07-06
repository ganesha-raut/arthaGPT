import React, { useState, useEffect } from 'react';
import { X, Image, Sparkles, Wand2, Loader2, Download, Copy, Check, Eye } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../database/db';

interface ImageStudioProps {
  onClose: () => void;
}

interface GalleryImage {
  messageId: string;
  url: string;
  prompt: string;
  timestamp: number;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({ onClose }) => {
  const { activeChatId, isImageStudioOpen, isStreaming } = useChatStore();
  const [activeTab, setActiveTab] = useState<'create' | 'gallery'>('create');
  
  // Generator states
  const [inputPrompt, setInputPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState('512x512');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  // Throttled image gallery cache loaded via effect
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    // Prevent reading entire message list repeatedly during active streaming
    if (isStreaming) return;

    const loadGallery = async () => {
      try {
        const msgs = await db.messages.toArray();
        const imgs: GalleryImage[] = [];
        
        msgs.forEach((m) => {
          // Find markdown images matching ![alt](url)
          const matches = [...m.content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
          matches.forEach((match) => {
            if (match[2]) {
              imgs.push({
                messageId: m.id,
                prompt: match[1] || 'AI Generated Art',
                url: match[2],
                timestamp: m.createdAt
              });
            }
          });
        });
        
        // Sort latest first
        imgs.sort((a, b) => b.timestamp - a.timestamp);
        setGalleryImages(imgs);
      } catch (err) {
        console.warn('Failed to compile image gallery:', err);
      }
    };

    loadGallery();
  }, [isStreaming, isImageStudioOpen, activeChatId]);

  // Reset states on chat change
  useEffect(() => {
    setInputPrompt('');
    setOptimizedPrompt('');
    setGeneratedImageUrl('');
  }, [activeChatId]);

  const handleEnhancePrompt = async () => {
    if (!inputPrompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are a professional stable diffusion prompt generator. Enhance the user\'s image description to make it highly visual, detail-rich, artistic, and cinematic. Do not mention sizes or aspect ratios. Return ONLY the enhanced visual prompt, with no introductory text, no comments, and no quotation marks.'
            },
            {
              role: 'user',
              content: inputPrompt
            }
          ],
          temperature: 0.6,
          max_tokens: 250
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        if (enhanced) {
          setOptimizedPrompt(enhanced);
        }
      }
    } catch (err) {
      console.error('Enhancing prompt failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateImage = async () => {
    const finalPrompt = (optimizedPrompt || inputPrompt).trim();
    if (!finalPrompt || !activeChatId || isGenerating) return;
    
    setIsGenerating(true);
    setGeneratedImageUrl('');
    
    // Add prompt size indicator into the prompt string
    const sizedPrompt = `${finalPrompt}, high quality digital art, resolution ${selectedSize}`;
    
    const assistantMsgId = `msg-${Math.random().toString(36).substring(2, 11)}`;
    
    // Add placeholder message to chat
    await db.messages.add({
      id: assistantMsgId,
      chatId: activeChatId,
      role: 'assistant',
      content: `🎨 *Generating image in Art Studio (${selectedSize}):* **"${finalPrompt}"**...`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'sending'
    });

    try {
      const response = await fetch('/.netlify/functions/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sizedPrompt })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();
      
        if (data.status === 'success' && data.imageUrl) {
          // Prefer server-generated data URI for durable local storage
          let localBase64 = data.imageDataUri || data.imageUrl;
          if (!data.imageDataUri) {
            try {
              const imgRes = await fetch(data.imageUrl);
              const blob = await imgRes.blob();
              localBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (e) {
              console.warn('Base64 convert failed in studio, using URL:', e);
            }
          }

          setGeneratedImageUrl(localBase64);
          
          // Update placeholder message with generated image markdown
          await db.messages.update(assistantMsgId, {
            content: `Here is your generated image: 🎨\n\n![${finalPrompt}](${localBase64})`,
            status: 'success',
            updatedAt: Date.now()
          });
          
          // Switch to gallery to show new art
          setActiveTab('gallery');
        } else {
          throw new Error(data.error || 'No image URL returned');
        }
      } catch (err: any) {
        console.error(err);
        await db.messages.update(assistantMsgId, {
          content: `❌ Failed to generate image: ${err.message}`,
          status: 'failed',
          updatedAt: Date.now()
        });
        alert(`Image generation failed: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
    };

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-[340px] h-full flex-shrink-0 flex flex-col bg-zinc-950 border-l border-zinc-900 select-none max-md:fixed max-md:right-0 max-md:top-0 max-md:z-30 max-md:shadow-2xl max-sm:w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/20">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">AI Art Studio</span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-450 hover:text-zinc-200 cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-900 px-2 py-1 gap-1">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            activeTab === 'create' 
              ? 'bg-zinc-900 text-white' 
              : 'text-zinc-550 hover:text-zinc-200'
          }`}
        >
          🎨 Studio
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'gallery' 
              ? 'bg-zinc-900 text-white' 
              : 'text-zinc-550 hover:text-zinc-200'
          }`}
        >
          🖼️ Gallery
          {galleryImages.length > 0 && (
            <span className="bg-violet-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {galleryImages.length}
            </span>
          )}
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin select-text">
        {activeTab === 'create' ? (
          <div className="space-y-4">
            
            {/* Prompt Input Box */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Image Description</label>
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Describe the image you want to create (e.g. 'a cute cat wearing a spacesuit')..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Prompt Enhancer Trigger */}
            {inputPrompt.trim() && (
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing}
                className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-violet-900/30 text-xs font-semibold transition-all cursor-pointer ${
                  isEnhancing 
                    ? 'bg-violet-600/10 text-violet-400 animate-pulse' 
                    : 'bg-violet-900/20 text-violet-300 hover:bg-violet-900/30'
                }`}
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Optimizing Prompt...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Optimize Prompt with LLM</span>
                  </>
                )}
              </button>
            )}

            {/* Editable Optimized Prompt Display */}
            {optimizedPrompt && (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-violet-400 uppercase tracking-wider">Enhanced Prompt (Editable)</label>
                  <button 
                    onClick={() => setOptimizedPrompt('')} 
                    className="text-[9px] text-zinc-500 hover:text-zinc-300"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  value={optimizedPrompt}
                  onChange={(e) => setOptimizedPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900/60 border border-violet-900/20 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none font-sans leading-relaxed"
                />
              </div>
            )}

            {/* Settings Row */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Resolution / Size</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none cursor-pointer font-sans"
                >
                  <option value="512x512">512 x 512 (Square)</option>
                  <option value="1024x1024">1024 x 1024 (HD Square)</option>
                  <option value="768x1024">768 x 1024 (Portrait)</option>
                  <option value="1024x768">1024 x 768 (Landscape)</option>
                  <option value="256x256">256 x 256 (Draft)</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={!inputPrompt.trim() || isGenerating}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                inputPrompt.trim() && !isGenerating
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:scale-102 hover:shadow-violet-600/20 active:scale-98'
                  : 'bg-zinc-900 border border-zinc-850 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Art...</span>
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 text-white" />
                  <span>Create Magic Art</span>
                </>
              )}
            </button>

            {/* Preview image */}
            {generatedImageUrl && (
              <div className="mt-4 border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950 p-2.5 space-y-2.5">
                <img 
                  src={generatedImageUrl} 
                  alt="Generated Art Preview" 
                  className="w-full h-auto object-cover rounded-lg aspect-square border border-zinc-900"
                />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-550 text-[10px]">Preview</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(generatedImageUrl, 'preview')}
                      className="p-1.5 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-200 rounded-lg cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedId === 'preview' ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={generatedImageUrl}
                      download="ArthaGPT-Art.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-200 rounded-lg cursor-pointer flex items-center"
                      title="Download Image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          /* Gallery tab */
          <div className="space-y-4">
            {galleryImages.length === 0 ? (
              <div className="text-center py-16 text-zinc-650 text-xs select-none">
                <Image className="w-8 h-8 text-zinc-850 mx-auto mb-2.5" />
                <p>No images generated in this conversation yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 select-none">
                {galleryImages.map((img, i) => (
                  <div 
                    key={img.messageId + '_' + i} 
                    className="relative rounded-xl overflow-hidden aspect-square border border-zinc-900 group cursor-pointer bg-zinc-900/30"
                    onClick={() => setLightboxImage(img)}
                  >
                    <img 
                      src={img.url} 
                      alt={img.prompt} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end gap-1 select-none">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(img.url, img.messageId);
                          }}
                          className="p-1.5 bg-zinc-950/80 rounded-lg text-zinc-450 hover:text-zinc-150 cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedId === img.messageId ? <Check className="w-3 h-3 text-emerald-450" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-zinc-300 bg-zinc-950/50 px-1.5 py-0.5 rounded truncate">
                        <Eye className="w-2.5 h-2.5 text-zinc-450" />
                        <span className="truncate">{img.prompt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox full-screen view modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-fade-in select-text"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-3.5 border-b border-zinc-900 select-none">
              <span className="text-xs font-bold text-zinc-400">Artwork Viewer</span>
              <button 
                onClick={() => setLightboxImage(null)} 
                className="p-1 hover:bg-zinc-900 text-zinc-450 hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Image display */}
            <div className="bg-zinc-900/20 p-2.5 flex items-center justify-center min-h-[280px]">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.prompt} 
                className="max-h-[380px] w-auto object-contain rounded-lg shadow border border-zinc-900"
              />
            </div>
            
            {/* Modal Info panel */}
            <div className="p-4 border-t border-zinc-900 space-y-3">
              <div>
                <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider block mb-1">Image Prompt</span>
                <p className={`text-xs text-zinc-250 leading-relaxed font-sans select-all bg-zinc-900/50 p-2.5 border border-zinc-900 rounded-xl ${
                  !promptExpanded ? 'line-clamp-2 overflow-hidden' : ''
                }`}>
                  {lightboxImage.prompt}
                </p>
                {lightboxImage.prompt.length > 90 && (
                  <button 
                    onClick={() => setPromptExpanded(!promptExpanded)}
                    className="text-[10px] text-violet-400 mt-1 hover:underline font-semibold cursor-pointer"
                  >
                    {promptExpanded ? 'Collapse Prompt' : 'Expand Full Prompt'}
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-2.5 pt-1.5 border-t border-zinc-900 select-none">
                <button
                  onClick={() => handleCopyLink(lightboxImage.url, lightboxImage.messageId + '_modal')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-850 hover:bg-zinc-900 text-xs font-semibold text-zinc-350 cursor-pointer"
                >
                  {copiedId === lightboxImage.messageId + '_modal' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-450" />
                      <span className="text-emerald-450">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
                <a
                  href={lightboxImage.url}
                  download="ArthaGPT-Art.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
