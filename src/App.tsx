// ═══════════════════════════════════════════════════════
//  App.tsx — Roteador de Fases + Música + Telas
// ═══════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { MUSICA_SPRITE } from './musicSprite';
import { BASE_W, BASE_H, MAX_HP, GAME_CSS, TitleScreen, PhaseTransitionScreen, GameOverScreen, VictoryScreen } from './gameCore';
import Fase1 from './Fase1';
import Fase2 from './Fase2';

type Screen = 'title' | 'fase1' | 'phase_transition' | 'fase2' | 'gameover' | 'victory';

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [muted, setMuted] = useState(false);
  const [viewScale, setViewScale] = useState(1);

  // ── Escala responsiva ──
  useEffect(() => {
    const calc = () => { const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H); setViewScale(s); };
    calc(); window.addEventListener('resize', calc);
    const oc = () => setTimeout(calc, 300); window.addEventListener('orientationchange', oc);
    return () => { window.removeEventListener('resize', calc); window.removeEventListener('orientationchange', oc); };
  }, []);

  // ── Música ──
  const musicRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { const a = new Audio(MUSICA_SPRITE); a.loop = true; a.volume = 0.5; a.preload = 'auto'; musicRef.current = a; return () => { a.pause(); a.src = ''; }; }, []);
  useEffect(() => {
    const a = musicRef.current; if (!a) return;
    if (screen === 'fase1' || screen === 'fase2') { a.volume = 0.5; a.play().catch(() => {}); }
    else if (screen === 'gameover') { let v = a.volume; const f = setInterval(() => { v -= 0.05; if (v <= 0) { clearInterval(f); a.pause(); a.volume = 0.5; } else a.volume = v; }, 50); return () => clearInterval(f); }
    else if (screen === 'victory') a.volume = 0.25;
    else if (screen === 'phase_transition') a.volume = 0.3;
    else { a.pause(); a.currentTime = 0; a.volume = 0.5; }
  }, [screen]);
  useEffect(() => { if (musicRef.current) musicRef.current.muted = muted; }, [muted]);
  const toggleMute = useCallback(() => setMuted(m => !m), []);

  // ── Navegação entre telas ──
  const startGame = useCallback(() => {
    setScore(0); setHp(MAX_HP); setScreen('fase1');
  }, []);

  const onFase1Complete = useCallback((newScore: number, newHp: number) => {
    setScore(newScore); setHp(newHp); setScreen('phase_transition');
  }, []);

  const startFase2 = useCallback(() => {
    setScreen('fase2');
  }, []);

  const onVictory = useCallback((finalScore: number) => {
    setScore(finalScore); setScreen('victory');
  }, []);

  const onGameOver = useCallback((finalScore: number) => {
    setScore(finalScore); setScreen('gameover');
  }, []);

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Press Start 2P", monospace, system-ui', userSelect: 'none', touchAction: 'none' }} onContextMenu={e => e.preventDefault()}>
      <style>{GAME_CSS}</style>
      <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${viewScale})`, transformOrigin: 'center center', position: 'relative', overflow: 'hidden', imageRendering: 'pixelated' }}>

        {screen === 'fase1' && (
          <Fase1
            initialScore={0}
            initialHp={MAX_HP}
            muted={muted}
            onToggleMute={toggleMute}
            onComplete={onFase1Complete}
            onGameOver={onGameOver}
            onRestart={startGame}
          />
        )}

        {screen === 'fase2' && (
          <Fase2
            initialScore={score}
            initialHp={hp}
            muted={muted}
            onToggleMute={toggleMute}
            onVictory={onVictory}
            onGameOver={onGameOver}
            onRestart={startGame}
          />
        )}

        {screen === 'title' && <TitleScreen onStart={startGame} />}
        {screen === 'phase_transition' && <PhaseTransitionScreen score={score} onContinue={startFase2} />}
        {screen === 'gameover' && <GameOverScreen score={score} onRetry={startGame} />}
        {screen === 'victory' && <VictoryScreen score={score} onRetry={startGame} />}

      </div>
    </div>
  );
}
