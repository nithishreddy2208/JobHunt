import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Thin wrapper around the Web Speech API (window.SpeechRecognition / webkitSpeechRecognition).
 *
 * Returns:
 *   - supported:    boolean   – browser supports the API
 *   - listening:    boolean   – currently capturing audio
 *   - transcript:   string    – finalized + interim text concatenated
 *   - interim:      string    – the latest in-flight (not yet finalized) segment
 *   - error:        string|null
 *   - start():      begin capturing (requests mic permission if needed)
 *   - stop():       stop capturing
 *   - reset():      clear transcript and error
 *
 * The hook keeps a single recognizer instance per mount and tears it down on unmount.
 */
export const useSpeechRecognition = ({ lang = 'en-US' } = {}) => {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const supported = Boolean(SpeechRecognition);

  const recognizerRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);

  // Build the recognizer lazily and reuse it.
  const getRecognizer = useCallback(() => {
    if (!supported) return null;
    if (recognizerRef.current) return recognizerRef.current;

    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;

    r.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript || '';
        if (res.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current}${text} `.replace(/\s+/g, ' ');
        } else {
          interimText += text;
        }
      }
      setTranscript(finalTranscriptRef.current.trim());
      setInterim(interimText);
    };

    r.onerror = (event) => {
      const code = event?.error || 'unknown';
      const msg = {
        'not-allowed': 'Microphone permission was denied.',
        'service-not-allowed': 'Speech service not allowed by the browser.',
        'no-speech': 'No speech detected. Try again.',
        'audio-capture': 'No microphone was found.',
        network: 'Network error during speech recognition.'
      }[code] || `Speech recognition error: ${code}`;
      setError(msg);
      setListening(false);
    };

    r.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognizerRef.current = r;
    return r;
  }, [SpeechRecognition, supported, lang]);

  const start = useCallback(() => {
    if (!supported) {
      setError('This browser does not support speech recognition. Use Chrome or Edge.');
      return;
    }
    setError(null);
    const r = getRecognizer();
    if (!r) return;
    try {
      r.start();
      setListening(true);
    } catch (err) {
      // start() throws if already started — treat as a no-op.
      if (!String(err?.message || '').includes('already started')) {
        setError(err?.message || 'Failed to start recognition');
      }
    }
  }, [supported, getRecognizer]);

  const stop = useCallback(() => {
    const r = recognizerRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const r = recognizerRef.current;
      if (r) {
        try {
          r.onresult = null;
          r.onerror = null;
          r.onend = null;
          r.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
};

/**
 * Small helper for the bonus "Read Question" feature. Uses window.speechSynthesis.
 * Safe to call even when unsupported — it just no-ops.
 */
export const speak = (text, { lang = 'en-US', rate = 1, pitch = 1, onStart, onEnd } = {}) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text || ''));
    utter.lang = lang;
    utter.rate = rate;
    utter.pitch = pitch;
    // Optional lifecycle callbacks let callers show an "AI speaking" indicator.
    utter.onstart = () => onStart?.();
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  } catch {
    onEnd?.();
  }
};
