import { useCallback, useEffect, useState } from 'react';
import type { StoryScene } from '../../data/stories/carpenterStory';
import { useAudioContext } from '../../contexts/AudioContext';
import './StoryScreen.css';

interface StoryScreenProps {
  scenes: StoryScene[];
  onComplete: () => void;
  showStartButton?: boolean;
}

export const StoryScreen = ({ scenes, onComplete, showStartButton = true }: StoryScreenProps) => {
  const { stopBgm } = useAudioContext();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [activeBackground, setActiveBackground] = useState<string>(scenes[0]?.background ?? '');
  const [previousBackground, setPreviousBackground] = useState<string | null>(null);
  const [isBgFading, setIsBgFading] = useState(false);

  const currentScene = scenes[sceneIndex];
  const currentLine = currentScene.lines[lineIndex] ?? '';

  useEffect(() => {
    stopBgm();
  }, [stopBgm]);

  useEffect(() => {
    setDisplayed('');
    setIsTyping(true);

    let i = 0;
    const timer = window.setInterval(() => {
      if (i < currentLine.length) {
        setDisplayed(currentLine.slice(0, i + 1));
        i += 1;
      } else {
        setIsTyping(false);
        window.clearInterval(timer);
      }
    }, 55);

    return () => window.clearInterval(timer);
  }, [sceneIndex, lineIndex, currentLine]);

  useEffect(() => {
    if (currentScene.background === activeBackground) return;
    let cancelled = false;
    const nextBackground = currentScene.background;
    const preload = new Image();
    preload.src = nextBackground;
    preload.onload = () => {
      if (cancelled) return;
      setPreviousBackground(activeBackground);
      setActiveBackground(nextBackground);
      setIsBgFading(true);
    };
    preload.onerror = () => {
      if (cancelled) return;
      setPreviousBackground(activeBackground);
      setActiveBackground(nextBackground);
      setIsBgFading(true);
    };
    return () => {
      cancelled = true;
    };
  }, [activeBackground, currentScene.background]);

  useEffect(() => {
    if (!isBgFading) return;
    const timer = window.setTimeout(() => {
      setIsBgFading(false);
      setPreviousBackground(null);
    }, 820);
    return () => window.clearTimeout(timer);
  }, [isBgFading]);

  const handleTap = useCallback(() => {
    if (isTyping) {
      return;
    }

    const isLastLine = lineIndex >= currentScene.lines.length - 1;
    const isLastScene = sceneIndex >= scenes.length - 1;

    if (!isLastLine) {
      setLineIndex((prev) => prev + 1);
      return;
    }
    if (!isLastScene) {
      setSceneIndex((prev) => prev + 1);
      setLineIndex(0);
      return;
    }
    onComplete();
  }, [currentLine, currentScene.lines.length, isTyping, lineIndex, onComplete, sceneIndex, scenes.length]);

  const isLastScene = sceneIndex >= scenes.length - 1;
  const isLastLine = lineIndex >= currentScene.lines.length - 1;
  const isEnd = isLastScene && isLastLine && !isTyping;

  return (
    <div className="story-screen" onClick={handleTap}>
      {previousBackground && (
        <div className="story-bg story-bg--prev" style={{ backgroundImage: `url(${previousBackground})` }} />
      )}
      <div
        className={`story-bg story-bg--active ${isBgFading ? 'story-bg--fading' : ''}`}
        style={{ backgroundImage: `url(${activeBackground})` }}
      />

      <div className="story-overlay" />
      <div className="story-bottom-vignette" />

      <div className="story-progress">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className={`story-dot ${
              index === sceneIndex ? 'story-dot--active' : index < sceneIndex ? 'story-dot--done' : ''
            }`}
          />
        ))}
      </div>

      <div className="story-textbox">
        <p className="story-text">{displayed}</p>
        {!isTyping && !isEnd && <span className="story-cursor">▼</span>}
        {isEnd && showStartButton && (
          <button
            type="button"
            className="story-btn-start"
            onClick={(event) => {
              event.stopPropagation();
              onComplete();
            }}
          >
            冒険を始める
          </button>
        )}
      </div>

      <button
        type="button"
        className="story-btn-skip"
        onClick={(event) => {
          event.stopPropagation();
          onComplete();
        }}
      >
        スキップ
      </button>
    </div>
  );
};
