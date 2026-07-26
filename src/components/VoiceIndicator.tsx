import React from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  isLiveActive: boolean;
  onToggleMic: () => void;
  onStopSpeech?: () => void;
}

export default function VoiceIndicator({
  isListening, isSpeaking, isLiveActive, onToggleMic, onStopSpeech
}: VoiceIndicatorProps) {
  if (isLiveActive) return null;

  return (
    <div className="flex items-center space-x-2">
      {isSpeaking && onStopSpeech && (
        <button onClick={onStopSpeech}
          className="relative p-2.5 rounded-xl bg-amber-100 text-amber-800 transition-all group">
          <div className="absolute inset-0 rounded-xl animate-pulse-ring bg-amber-300/40"></div>
          <Volume2 className="w-5 h-5 relative z-10" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
        </button>
      )}

      <button onClick={onToggleMic}
        className={`relative p-3 rounded-xl transition-all ${
          isListening
            ? 'bg-rose-600 text-white animate-glow-pulse'
            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
        }`}>
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-xl animate-pulse-ring bg-rose-500/30"></div>
            <div className="absolute inset-0 rounded-xl animate-pulse-ring-delayed bg-rose-500/20"></div>
          </>
        )}
        <div className="relative z-10 flex items-center justify-center space-x-0.5">
          {isListening ? (
            <div className="flex items-center space-x-0.5">
              <MicOff className="w-5 h-5" />
              <div className="flex items-end space-x-0.5 ml-1">
                <span className="voice-wave-bar w-0.5 bg-white rounded-full" style={{ animationDelay: '0s' }}></span>
                <span className="voice-wave-bar w-0.5 bg-white rounded-full" style={{ animationDelay: '0.1s' }}></span>
                <span className="voice-wave-bar w-0.5 bg-white rounded-full" style={{ animationDelay: '0.2s' }}></span>
                <span className="voice-wave-bar w-0.5 bg-white rounded-full" style={{ animationDelay: '0.15s' }}></span>
                <span className="voice-wave-bar w-0.5 bg-white rounded-full" style={{ animationDelay: '0.05s' }}></span>
              </div>
            </div>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </div>
      </button>
    </div>
  );
}
