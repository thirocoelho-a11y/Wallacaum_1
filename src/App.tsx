import { useEffect, useRef, useState, useCallback } from 'react';
import { WALLACAUM_SPRITES, DAVISAUM_SPRITES, CENARIO_SPRITES, INIMIGOS_SPRITES } from './sprites';

// ── Música como sprite base64 (não precisa de arquivo externo) ──
import { MUSICA_SPRITE } from './musicSprite';

// ─────────────────────────────────────────────────────
//  CONSTANTES DO JOGO
// ─────────────────────────────────────────────────────
const BASE_W = 800;
const BASE_H = 500;
const WORLD_W = 3200;
const FLOOR_MIN = BASE_H - 150;
const FLOOR_MAX = BASE_H - 20;

const GRAVITY = 0.65;
const JUMP_FORCE = 13;
const JUMP_CUT = 0.4;
const PLAYER_ACCEL = 0.55;
const PLAYER_DECEL = 0.78;
const PLAYER_MAX_SPEED = 4.0;
const COYOTE_TIME = 6;
const LAND_SQUASH_FRAMES = 6;

const PUNCH_RANGE = 85;
const PUNCH_DEPTH = 45;
const PUNCH_DAMAGE = 1;
const PUNCH_DURATION = 18;
const PUNCH_ACTIVE = [4, 12];
const BUFA_RANGE = 170;
const BUFA_DEPTH = 85;
const BUFA_DAMAGE_NORMAL = 3;
const BUFA_DAMAGE_BOSS = 5;
const BUFA_DURATION = 50;
const BUFA_ACTIVE_START = 12;
const HITSTOP_FRAMES = 4;
const KNOCKBACK_DECAY = 0.82;
const COMBO_TIMEOUT = 90;

const ENEMY_SPEED = 1.3;
const SPAWN_INTERVAL_MS = 3500;
const MAX_ENEMIES = 7;
const BOSS_SCORE_THRESHOLD = 1000;

const MAX_HP = 100;
const FOOD_SIZE = 28;
const MAX_PARTICLES = 60;

// Davisaum — constantes corrigidas
const DAV_SCARED_ENTER = 130;
const DAV_SCARED_EXIT = 220;
const DAV_FLEE_SPEED = 2.5;
const DAV_FOLLOW_LERP = 0.08;
const DAV_DEAD_ZONE = 6;
const DAV_SNAP_DIST = 2;

// ─────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────
interface Player {
  x: number; y: number; vx: number; vy: number;
  z: number; vz: number; hp: number; dir: 'left' | 'right';
  attacking: boolean; buffing: boolean;
  hurt: boolean; hurtTimer: number;
  atkTimer: number; buffTimer: number; invincible: number;
  coyoteTimer: number; landSquash: number; wasGrounded: boolean;
  combo: number; comboTimer: number; hitstop: number;
}

interface Enemy {
  id: string; type: 'standard' | 'fast' | 'suka';
  x: number; y: number; z: number;
  hp: number; maxHp: number; dir: 'left' | 'right';
  walking: boolean; hurt: boolean;
  hurtTimer: number; kbx: number; kby: number;
  atkCd: number; stateTimer: number; punchTimer: number;
  hitThisSwing: boolean;
}

interface FoodItem {
  id: string; x: number; y: number;
  type: 'burger' | 'fries' | 'manual' | 'compass';
  t: number; vy: number; landed: boolean;
}

interface Particle {
  id: string; x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  type: 'dust' | 'hit' | 'spark' | 'ring';
}

interface FloatingTextData {
  id: string; text: string;
  x: number; y: number; color: string; size: number; t: number;
}

interface Davisaum {
  x: number; y: number; dir: 'left' | 'right';
  throwTimer: number;
  isWalking: boolean; isThrowing: boolean; isScared: boolean;
}

// ─────────────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────────────
const rng = (a: number, b: number) => Math.random() * (b - a) + a;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
let _id = 0;
const uid = () => `u${++_id}`;
const dist = (ax: number, ay: number, bx: number, by: number) => Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

function spawnParticles(
  arr: Particle[], count: number, x: number, y: number,
  color: string, type: Particle['type'] = 'hit',
  spread = 4, life = 20, size = 4
) {
  for (let i = 0; i < count && arr.length < MAX_PARTICLES; i++) {
    arr.push({
      id: uid(), x, y,
      vx: rng(-spread, spread), vy: rng(-spread * 0.8, -0.5),
      life, maxLife: life, color, size: rng(size * 0.5, size * 1.2), type,
    });
  }
}

// ─────────────────────────────────────────────────────
//  HOOK: ESCALA RESPONSIVA
// ─────────────────────────────────────────────────────
function useResponsiveScale() {
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 900 || ('ontouchstart' in window);
      setIsMobile(mobile);

      const controlsH = mobile ? 170 : 80;
      const marginsH = 50;
      const totalH = BASE_H + controlsH + marginsH;
      const totalW = BASE_W + 20;

      const s = Math.min(vw / totalW, vh / totalH, 1.0);
      setScale(Math.max(s, 0.25));
    };

    calc();
    window.addEventListener('resize', calc);
    const onOrient = () => setTimeout(calc, 250);
    window.addEventListener('orientationchange', onOrient);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  return { scale, isMobile };
}

// ─────────────────────────────────────────────────────
//  COMPONENTES VISUAIS
// ─────────────────────────────────────────────────────

function PixelWallacaum({ direction, isWalking, isAttacking, isBuffa, isHurt, jumpZ, landSquash, combo }: {
  direction: string; isWalking: boolean; isAttacking: boolean;
  isBuffa: boolean; isHurt: boolean; jumpZ: number;
  landSquash: number; combo: number;
}) {
  const flip = direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  let spr = WALLACAUM_SPRITES.parado;
  if (isHurt) spr = WALLACAUM_SPRITES.dor;
  else if (isBuffa) spr = WALLACAUM_SPRITES.bufa;
  else if (isAttacking) spr = WALLACAUM_SPRITES.soco;
  else if (jumpZ > 0) spr = WALLACAUM_SPRITES.pulando;
  else if (isWalking) spr = Math.floor(Date.now() / 140) % 2 === 0 ? WALLACAUM_SPRITES.walk1 : WALLACAUM_SPRITES.walk2;

  let scaleX = 1, scaleY = 1;
  if (jumpZ > 8) { scaleX = 0.9; scaleY = 1.12; }
  else if (landSquash > 0) { const t = landSquash / LAND_SQUASH_FRAMES; scaleX = 1 + t * 0.15; scaleY = 1 - t * 0.12; }

  const flt = isHurt
    ? 'drop-shadow(0 0 12px rgba(255,50,50,0.9)) brightness(1.8) sepia(1) hue-rotate(-50deg) saturate(4)'
    : 'drop-shadow(2px 3px 0px rgba(0,0,0,0.55))';
  const shadowScale = clamp(1 - jumpZ / 120, 0.3, 1);
  const shadowOpacity = clamp(0.5 - jumpZ / 200, 0.1, 0.5);

  return (
    <div style={{ transform: `${flip} scaleX(${scaleX}) scaleY(${scaleY})`, transformOrigin: 'bottom center', position: 'relative', width: 140, height: 160, transition: 'transform 0.04s' }}>
      {isBuffa && (
        <div style={{ position: 'absolute', left: -60, top: -20, width: 260, height: 220, pointerEvents: 'none', zIndex: -1 }}>
          <div style={{ position: 'absolute', left: 30, top: 40, width: 120, height: 100, borderRadius: '60% 40% 50% 60%', background: 'radial-gradient(ellipse, rgba(80,220,160,0.5) 0%, rgba(46,204,113,0.2) 40%, transparent 70%)', filter: 'blur(8px)', animation: 'smokeRise 0.8s infinite' }} />
          <div style={{ position: 'absolute', left: 10, top: 20, width: 140, height: 130, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(46,204,113,0.15) 0%, transparent 70%)', filter: 'blur(12px)', animation: 'pulse 0.3s infinite alternate' }} />
          <div style={{ position: 'absolute', left: 0, bottom: 10, width: 260, height: 50, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(50,200,130,0.45) 0%, transparent 80%)', filter: 'blur(6px)', animation: 'pulse 0.4s infinite alternate' }} />
        </div>
      )}
      <img src={spr} alt="Wallaçaum" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 0, width: 180, height: 180, objectFit: 'contain', imageRendering: 'pixelated', pointerEvents: 'none', filter: flt, opacity: isHurt ? (Math.floor(Date.now() / 60) % 2 === 0 ? 0.4 : 0.9) : 1 }} />
      {isBuffa && <div style={{ position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)', color: '#2ecc71', fontWeight: 900, fontSize: 13, letterSpacing: 2, textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 0 0 10px rgba(46,204,113,0.5)', whiteSpace: 'nowrap', animation: 'pulse 0.3s infinite alternate' }}>⚡ BUFA CELESTE! ⚡</div>}
      {combo >= 3 && <div style={{ position: 'absolute', top: -55, left: '50%', transform: 'translateX(-50%)', color: combo >= 8 ? '#e74c3c' : combo >= 5 ? '#f39c12' : '#f1c40f', fontWeight: 900, fontSize: combo >= 8 ? 18 : 14, textShadow: '2px 2px 0 #000, -1px -1px 0 #000', whiteSpace: 'nowrap', animation: 'pulse 0.2s infinite alternate' }}>{combo}x COMBO!</div>}
      <div style={{ position: 'absolute', bottom: -8, left: '15%', width: `${70 * shadowScale}%`, height: 12, background: `rgba(0,0,0,${shadowOpacity})`, borderRadius: '50%', transform: `scaleX(${shadowScale})`, transformOrigin: 'center' }} />
    </div>
  );
}

function PixelDavisaum({ direction, isWalking, isThrowing, isScared, frame }: {
  direction: string; isWalking: boolean; isThrowing: boolean; isScared: boolean; frame: number;
}) {
  const flip = direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  let spr = DAVISAUM_SPRITES.parado;
  if (isScared) spr = DAVISAUM_SPRITES.medo;
  else if (isThrowing) spr = DAVISAUM_SPRITES.jogando;
  else if (isWalking) spr = Math.floor(Date.now() / 200) % 2 === 0 ? DAVISAUM_SPRITES.walk : DAVISAUM_SPRITES.parado;
  const bob = isWalking && !isScared && !isThrowing ? Math.sin(frame * 0.4) * 3 : 0;
  const scaredShake = isScared ? Math.sin(frame * 1.5) * 2 : 0;

  return (
    <div style={{ transform: `${flip} translateX(${scaredShake}px)`, position: 'relative', width: 100, height: 140 }}>
      <div style={{ position: 'absolute', bottom: -8, left: 20, width: 60, height: 10, background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }} />
      {isScared && <div style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', fontSize: 16, animation: 'pulse 0.3s infinite alternate' }}>😰</div>}
      <img src={spr} alt="Davisaum" style={{ position: 'absolute', bottom: bob, left: -35, width: 170, objectFit: 'contain', imageRendering: 'pixelated', pointerEvents: 'none' }} />
    </div>
  );
}

function PixelAgent({ type, direction, isWalking, punchTimer, stateTimer, frame, isHurt, hp, maxHp }: {
  type: string; direction: string; isWalking: boolean; punchTimer: number; stateTimer: number; frame: number; isHurt: boolean; hp: number; maxHp: number;
}) {
  const flip = direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  const isPunching = punchTimer > 0;
  const isShouting = stateTimer > 0;
  let spr = INIMIGOS_SPRITES.capanga_loiro_parado;
  let enemyWidth = 160;

  if (type === 'suka') {
    enemyWidth = 180;
    if (isShouting) spr = INIMIGOS_SPRITES.suka_gritando;
    else if (isPunching) spr = INIMIGOS_SPRITES.suka_socando;
    else if (isWalking) spr = Math.floor(Date.now() / 200) % 2 === 0 ? INIMIGOS_SPRITES.suka_andando : INIMIGOS_SPRITES.suka_parada;
    else spr = INIMIGOS_SPRITES.suka_parada;
  } else if (type === 'fast') {
    if (isPunching) spr = INIMIGOS_SPRITES.capanga_preto_socando;
    else if (isWalking) spr = Math.floor(Date.now() / 180) % 2 === 0 ? INIMIGOS_SPRITES.capanga_preto_andando : INIMIGOS_SPRITES.capanga_preto_parado;
    else spr = INIMIGOS_SPRITES.capanga_preto_parado;
  } else {
    if (isPunching) spr = INIMIGOS_SPRITES.capanga_loiro_socando;
    else if (isWalking) spr = Math.floor(Date.now() / 200) % 2 === 0 ? INIMIGOS_SPRITES.capanga_loiro_andando : INIMIGOS_SPRITES.capanga_loiro_parado;
    else spr = INIMIGOS_SPRITES.capanga_loiro_parado;
  }

  const bob = isWalking && !isPunching && !isShouting ? Math.sin(frame * 0.3) * 3 : 0;
  const hurtSquash = isHurt ? 'scaleX(1.1) scaleY(0.9)' : '';
  const hurtFilter = isHurt ? 'brightness(2.5) sepia(1) hue-rotate(-50deg) saturate(4)' : '';
  const shakeX = isHurt ? rng(-3, 3) : 0;
  const hpPct = hp / maxHp;
  const hpColor = type === 'suka' ? `hsl(${280 + hpPct * 20}, 60%, ${45 + hpPct * 15}%)` : `hsl(${hpPct * 40}, 75%, 50%)`;

  return (
    <div style={{ transform: `${flip} translateX(${shakeX}px) ${hurtSquash}`, transformOrigin: 'bottom center', transition: 'filter 0.08s', filter: hurtFilter, position: 'relative', width: 100, height: 140 }}>
      <div style={{ position: 'absolute', bottom: -8, left: 10, width: 60, height: 10, background: type === 'suka' ? 'rgba(100,20,120,0.4)' : 'rgba(0,0,0,0.35)', borderRadius: '50%' }} />
      {type === 'suka' && isShouting && (
        <>
          <div style={{ position: 'absolute', top: 15, left: direction === 'right' ? 60 : -80, width: 100, height: 100, border: '4px solid rgba(52, 152, 219, 0.5)', borderRadius: '50%', animation: 'sonicWave 0.3s infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: direction === 'right' ? 40 : -100, width: 140, height: 140, border: '3px solid rgba(52, 152, 219, 0.25)', borderRadius: '50%', animation: 'sonicWave 0.3s 0.1s infinite', pointerEvents: 'none' }} />
        </>
      )}
      <img src={spr} alt="Inimigo" style={{ position: 'absolute', bottom: bob, left: -30, width: enemyWidth, objectFit: 'contain', imageRendering: 'pixelated', opacity: isHurt ? (Math.floor(Date.now() / 50) % 2 === 0 ? 0.5 : 1) : 1 }} />
      <div style={{ position: 'absolute', top: -18, left: 5, width: 70, height: 7, background: '#1a1a1a', border: '1.5px solid #333', borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
        <div style={{ width: `${hpPct * 100}%`, height: '100%', background: `linear-gradient(180deg, ${hpColor}, ${hpColor}dd)`, transition: 'width 0.2s ease-out', boxShadow: hpPct < 0.3 ? `0 0 6px ${hpColor}` : 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent)', borderRadius: '3px 3px 0 0' }} />
      </div>
      {type === 'suka' && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', color: '#9b59b6', fontWeight: 900, fontSize: 9, letterSpacing: 1, textShadow: '1px 1px 0 #000', whiteSpace: 'nowrap' }}>SUKA BARULHENTA</div>}
    </div>
  );
}

function FoodItemComp({ type, landed }: { type: string; landed: boolean }) {
  const bounce = !landed ? 'translateY(-4px)' : '';
  if (type === 'burger') return <div style={{ fontSize: 28, transform: bounce, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))', animation: 'itemFloat 1.5s infinite ease-in-out' }}>🍔</div>;
  if (type === 'fries') return <div style={{ fontSize: 28, transform: bounce, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))', animation: 'itemFloat 1.8s infinite ease-in-out' }}>🍟</div>;
  if (type === 'manual') return <div style={{ width: 24, height: 28, background: 'linear-gradient(135deg, #3498db, #2980b9)', border: '2px solid #1a6fa0', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', animation: 'itemFloat 2s infinite ease-in-out' }}>📘</div>;
  if (type === 'compass') return <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #bdc3c7, #95a5a6)', border: '2px solid #7f8c8d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, animation: 'itemFloat 1.7s infinite ease-in-out' }}>🧭</div>;
  return null;
}

function FloatingText({ text, x, y, color, size = 18 }: { text: string; x: number; y: number; color: string; size?: number }) {
  return <div style={{ position: 'absolute', left: x, top: y, color, fontWeight: 900, fontSize: size, fontFamily: '"Press Start 2P", monospace', textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 0 0 8px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 9999, animation: 'floatUp 0.9s ease-out forwards' }}>{text}</div>;
}

function ParticleRenderer({ particles, cam }: { particles: Particle[]; cam: number }) {
  return (
    <>
      {particles.map(p => {
        const alpha = p.life / p.maxLife;
        const sx = p.x - cam;
        if (sx < -20 || sx > BASE_W + 20) return null;
        if (p.type === 'ring') {
          const scale = 1 + (1 - alpha) * 2;
          return <div key={p.id} style={{ position: 'absolute', left: sx - 20, top: p.y - 20, width: 40, height: 40, borderRadius: '50%', border: `3px solid ${p.color}`, opacity: alpha * 0.6, transform: `scale(${scale})`, pointerEvents: 'none', zIndex: 9998 }} />;
        }
        return <div key={p.id} style={{ position: 'absolute', left: sx - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size, background: p.color, borderRadius: p.type === 'spark' ? '1px' : '50%', opacity: alpha, transform: p.type === 'spark' ? `rotate(${p.vx * 20}deg)` : '', boxShadow: `0 0 ${p.size}px ${p.color}`, pointerEvents: 'none', zIndex: 9998 }} />;
      })}
    </>
  );
}

function MobileBtn({ label, hint, k, keysRef, wide, color }: { label: string; hint?: string; k: string; keysRef: React.MutableRefObject<Record<string, boolean>>; wide?: boolean; color?: string }) {
  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); keysRef.current[k] = true; }}
      onPointerUp={(e) => { e.preventDefault(); keysRef.current[k] = false; }}
      onPointerLeave={(e) => { e.preventDefault(); keysRef.current[k] = false; }}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: wide ? 68 : 48, height: 50, background: `linear-gradient(180deg, ${color || '#555'}, ${color ? color + 'cc' : '#3a3a3a'})`, border: '2px solid rgba(255,255,255,0.15)', borderBottom: '3px solid rgba(0,0,0,0.4)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: wide ? 10 : 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'monospace', userSelect: 'none', WebkitUserSelect: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'transform 0.05s' }}
    >
      <span>{label}</span>
      {hint && <span style={{ fontSize: 8, opacity: 0.6, marginTop: 2 }}>{hint}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────────────

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = (hp / maxHp) * 100;
  const color = hp > 60 ? '#2ecc71' : hp > 30 ? '#f1c40f' : '#e74c3c';
  const glow = hp <= 30 ? `0 0 10px ${color}80` : 'none';
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10000, background: 'rgba(0,0,0,0.85)', padding: '10px 14px', borderRadius: 6, border: '2px solid #444', boxShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
      <div style={{ color: '#f1c40f', fontSize: 9, marginBottom: 5, letterSpacing: 2, fontWeight: 900 }}>⚡ WALLAÇAUM</div>
      <div style={{ width: 150, height: 16, background: '#222', border: '2px solid #444', borderRadius: 4, overflow: 'hidden', boxShadow: glow }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(180deg, ${color}, ${color}bb)`, transition: 'width 0.25s ease-out', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />
        </div>
      </div>
      <div style={{ color: '#888', fontSize: 8, marginTop: 3, textAlign: 'right' }}>{Math.max(0, Math.round(hp))}/{maxHp}</div>
    </div>
  );
}

function ScoreDisplay({ score, combo }: { score: number; combo: number }) {
  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10000, background: 'rgba(0,0,0,0.85)', padding: '10px 16px', borderRadius: 6, border: '2px solid #444', boxShadow: '0 2px 12px rgba(0,0,0,0.6)', textAlign: 'right' }}>
      <div style={{ color: '#f1c40f', fontSize: 11, fontWeight: 900, letterSpacing: 2 }}>SCORE</div>
      <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, fontFamily: '"Press Start 2P", monospace', textShadow: '0 0 8px rgba(241,196,15,0.3)' }}>{String(score).padStart(6, '0')}</div>
      {combo >= 2 && <div style={{ color: combo >= 8 ? '#e74c3c' : combo >= 5 ? '#f39c12' : '#f1c40f', fontSize: 9, fontWeight: 900, marginTop: 3, animation: 'pulse 0.3s infinite alternate' }}>COMBO x{combo}</div>}
    </div>
  );
}

function BossHpBar({ enemy }: { enemy: Enemy | undefined }) {
  if (!enemy) return null;
  const pct = (enemy.hp / enemy.maxHp) * 100;
  return (
    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, width: 320, background: 'rgba(0,0,0,0.9)', padding: '8px 12px', borderRadius: 6, border: '2px solid #7d3c98', boxShadow: '0 0 20px rgba(155,89,182,0.3)' }}>
      <div style={{ color: '#9b59b6', fontSize: 9, fontWeight: 900, letterSpacing: 2, marginBottom: 4, textAlign: 'center' }}>☠ SUKA BARULHENTA ☠</div>
      <div style={{ width: '100%', height: 12, background: '#222', border: '2px solid #555', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8e44ad, #9b59b6, #c39bd3)', transition: 'width 0.3s ease-out', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  BOTÃO DE MÚSICA
// ─────────────────────────────────────────────────────
function MusicButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10001, background: 'rgba(0,0,0,0.8)',
      border: `2px solid ${muted ? '#e74c3c' : '#2ecc71'}`,
      borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
      transition: 'border-color 0.2s',
    }}>
      <span style={{ fontSize: 14 }}>{muted ? '🔇' : '🔊'}</span>
      <span style={{ color: muted ? '#e74c3c' : '#2ecc71', fontSize: 8, fontWeight: 900, letterSpacing: 1, fontFamily: '"Press Start 2P", monospace' }}>
        {muted ? 'OFF' : 'ON'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  TELAS
// ─────────────────────────────────────────────────────
function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.92) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 36, color: '#f1c40f', fontWeight: 900, fontFamily: '"Press Start 2P", monospace', textShadow: '4px 4px 0 #c0392b, 6px 6px 0 rgba(0,0,0,0.5)', animation: 'pulse 1.5s infinite alternate', letterSpacing: 3 }}>WALLAÇAUM</div>
      <div style={{ fontSize: 11, color: '#e74c3c', marginTop: 8, letterSpacing: 3, fontWeight: 700, textShadow: '1px 1px 0 #000' }}>A CONSPIRAÇÃO DO SUPLEMENTO</div>
      <div style={{ marginTop: 10, color: '#888', fontSize: 9, textAlign: 'center', lineHeight: 1.8, maxWidth: 350 }}>
        <span style={{ color: '#f1c40f' }}>SETAS/WASD</span> Mover&ensp;·&ensp;
        <span style={{ color: '#e74c3c' }}>X</span> Soco&ensp;·&ensp;
        <span style={{ color: '#2ecc71' }}>C</span> Bufa Celeste&ensp;·&ensp;
        <span style={{ color: '#3498db' }}>Z/ESPAÇO</span> Pulo
      </div>
      <div onClick={onStart} style={{ marginTop: 28, padding: '14px 42px', background: 'linear-gradient(180deg, #e74c3c, #c0392b)', color: '#fff', fontWeight: 900, fontSize: 14, border: '3px solid #fff', borderRadius: 4, cursor: 'pointer', letterSpacing: 3, boxShadow: '0 4px 20px rgba(231,76,60,0.4)', animation: 'pulse 1.2s infinite alternate' }}>PRESS START</div>
    </div>
  );
}

function GameOverScreen({ score, onRetry }: { score: number; onRetry: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(40,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 36, color: '#e74c3c', fontWeight: 900, textShadow: '3px 3px 0 #000, 0 0 20px rgba(231,76,60,0.5)', animation: 'shake 0.5s infinite' }}>GAME OVER</div>
      <div style={{ color: '#f1c40f', fontSize: 14, marginTop: 12, fontWeight: 700 }}>SCORE: {score}</div>
      <div onClick={onRetry} style={{ marginTop: 20, padding: '12px 34px', background: 'linear-gradient(180deg, #e74c3c, #c0392b)', color: '#fff', fontWeight: 900, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 4, boxShadow: '0 4px 15px rgba(231,76,60,0.3)' }}>TENTAR DE NOVO</div>
    </div>
  );
}

function VictoryScreen({ score, onRetry }: { score: number; onRetry: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(0,40,20,0.85) 0%, rgba(0,0,0,0.95) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 36, color: '#2ecc71', fontWeight: 900, textShadow: '3px 3px 0 #000, 0 0 25px rgba(46,204,113,0.5)' }}>🏆 VITÓRIA! 🏆</div>
      <div style={{ color: '#fff', fontSize: 13, marginTop: 12 }}>SUKA BARULHENTA FOI DERROTADA.</div>
      <div style={{ color: '#95a5a6', fontSize: 10, marginTop: 6, fontStyle: 'italic' }}>São Burgão está salva... por enquanto.</div>
      <div style={{ color: '#f1c40f', fontSize: 16, marginTop: 10, fontWeight: 900 }}>SCORE: {score}</div>
      <div onClick={onRetry} style={{ marginTop: 22, padding: '12px 34px', background: 'linear-gradient(180deg, #3498db, #2980b9)', color: '#fff', fontWeight: 900, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 4, boxShadow: '0 4px 15px rgba(52,152,219,0.3)' }}>JOGAR NOVAMENTE</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  GAME LOOP PRINCIPAL
// ─────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'victory'>('title');
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const { scale } = useResponsiveScale();

  // ── Sistema de Música ──
  const musicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(MUSICA_SPRITE);
    audio.loop = true;
    audio.volume = 0.5;
    audio.preload = 'auto';
    musicRef.current = audio;
    return () => { audio.pause(); audio.src = ''; musicRef.current = null; };
  }, []);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    if (gameState === 'playing') {
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } else if (gameState === 'gameover') {
      let vol = audio.volume;
      const fade = setInterval(() => {
        vol -= 0.05;
        if (vol <= 0) { clearInterval(fade); audio.pause(); audio.volume = 0.5; }
        else audio.volume = vol;
      }, 50);
      return () => clearInterval(fade);
    } else if (gameState === 'victory') {
      audio.volume = 0.25;
    } else {
      audio.pause(); audio.currentTime = 0; audio.volume = 0.5;
    }
  }, [gameState]);

  useEffect(() => { if (musicRef.current) musicRef.current.muted = muted; }, [muted]);
  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const playerRef = useRef<Player>({ x: 200, y: 360, vx: 0, vy: 0, z: 0, vz: 0, hp: MAX_HP, dir: 'right', attacking: false, buffing: false, hurt: false, hurtTimer: 0, atkTimer: 0, buffTimer: 0, invincible: 0, coyoteTimer: 0, landSquash: 0, wasGrounded: true, combo: 0, comboTimer: 0, hitstop: 0 });
  const enemiesRef = useRef<Enemy[]>([]);
  const foodRef = useRef<FoodItem[]>([]);
  const textsRef = useRef<FloatingTextData[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const davisRef = useRef<Davisaum>({ x: 100, y: 360, dir: 'right', throwTimer: 0, isWalking: false, isThrowing: false, isScared: false });
  const keysRef = useRef<Record<string, boolean>>({});
  const frameRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const cameraRef = useRef(0);
  const bossSpawned = useRef(false);
  const screenShakeRef = useRef(0);
  const [, tick] = useState(0);

  const reset = useCallback(() => {
    playerRef.current = { x: 200, y: 360, vx: 0, vy: 0, z: 0, vz: 0, hp: MAX_HP, dir: 'right', attacking: false, buffing: false, hurt: false, hurtTimer: 0, atkTimer: 0, buffTimer: 0, invincible: 0, coyoteTimer: 0, landSquash: 0, wasGrounded: true, combo: 0, comboTimer: 0, hitstop: 0 };
    davisRef.current = { x: 100, y: 360, dir: 'right', throwTimer: 0, isWalking: false, isThrowing: false, isScared: false };
    enemiesRef.current = []; foodRef.current = []; textsRef.current = []; particlesRef.current = [];
    frameRef.current = 0; spawnTimerRef.current = 0; cameraRef.current = 0;
    bossSpawned.current = false; screenShakeRef.current = 0; _id = 0;
    setScore(0); setGameState('playing');
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // ── GAME LOOP ──
  useEffect(() => {
    if (gameState !== 'playing') return;
    let animId: number;
    const loop = () => {
      const p = playerRef.current;
      const k = keysRef.current;
      const f = ++frameRef.current;
      const dav = davisRef.current;
      const enemies = enemiesRef.current;
      const particles = particlesRef.current;

      if (p.hitstop > 0) { p.hitstop--; tick(f); animId = requestAnimationFrame(loop); return; }

      let inputX = 0, inputY = 0;
      if (k['arrowleft'] || k['a']) inputX -= 1;
      if (k['arrowright'] || k['d']) inputX += 1;
      if (k['arrowup'] || k['w']) inputY -= 1;
      if (k['arrowdown'] || k['s']) inputY += 1;
      if (inputX !== 0 && inputY !== 0) { inputX *= 0.707; inputY *= 0.707; }

      if (inputX !== 0) { p.vx += inputX * PLAYER_ACCEL; p.vx = clamp(p.vx, -PLAYER_MAX_SPEED, PLAYER_MAX_SPEED); p.dir = inputX > 0 ? 'right' : 'left'; }
      else { p.vx *= PLAYER_DECEL; if (Math.abs(p.vx) < 0.1) p.vx = 0; }
      if (inputY !== 0) { p.vy += inputY * PLAYER_ACCEL * 0.65; p.vy = clamp(p.vy, -PLAYER_MAX_SPEED * 0.65, PLAYER_MAX_SPEED * 0.65); }
      else { p.vy *= PLAYER_DECEL; if (Math.abs(p.vy) < 0.1) p.vy = 0; }

      p.x += p.vx; p.y += p.vy;
      p.x = clamp(p.x, 30, WORLD_W - 30);
      p.y = clamp(p.y, FLOOR_MIN, FLOOR_MAX);
      const targetCam = clamp(p.x - BASE_W / 2, 0, WORLD_W - BASE_W);
      cameraRef.current += (targetCam - cameraRef.current) * 0.07;

      const grounded = p.z <= 0 && p.vz <= 0;
      if (grounded) { p.coyoteTimer = COYOTE_TIME; if (!p.wasGrounded && p.landSquash <= 0) { p.landSquash = LAND_SQUASH_FRAMES; spawnParticles(particles, 4, p.x, p.y + 5, '#8B7355', 'dust', 2, 15, 5); } }
      else { if (p.coyoteTimer > 0) p.coyoteTimer--; }
      p.wasGrounded = grounded;
      if ((k['z'] || k[' ']) && p.coyoteTimer > 0 && p.z === 0) { p.vz = JUMP_FORCE; p.coyoteTimer = 0; p.landSquash = 0; spawnParticles(particles, 3, p.x, p.y + 5, '#8B7355', 'dust', 1.5, 12, 4); }
      if (!(k['z'] || k[' ']) && p.vz > 0) p.vz *= JUMP_CUT;
      if (p.z > 0 || p.vz > 0) { p.z += p.vz; p.vz -= GRAVITY; if (p.z <= 0) { p.z = 0; p.vz = 0; } }
      if (p.landSquash > 0) p.landSquash--;

      if (k['x'] && !p.attacking && !p.buffing && p.atkTimer <= 0) { p.attacking = true; p.atkTimer = PUNCH_DURATION; enemies.forEach(e => e.hitThisSwing = false); }
      if (p.atkTimer > 0) { p.atkTimer--; if (p.atkTimer <= 0) p.attacking = false; }
      if (k['c'] && !p.buffing && !p.attacking && p.buffTimer <= 0) { p.buffing = true; p.buffTimer = BUFA_DURATION; enemies.forEach(e => e.hitThisSwing = false); screenShakeRef.current = 8; }
      if (p.buffTimer > 0) { p.buffTimer--; if (p.buffTimer <= 0) p.buffing = false; }
      if (p.hurtTimer > 0) { p.hurtTimer--; if (p.hurtTimer <= 0) p.hurt = false; }
      if (p.invincible > 0) p.invincible--;
      if (p.comboTimer > 0) { p.comboTimer--; if (p.comboTimer <= 0) p.combo = 0; }
      if (screenShakeRef.current > 0) screenShakeRef.current--;

      // ── Davisaum AI (corrigida) ──
      const closestEnemyDist = enemies.length > 0 ? Math.min(...enemies.map(e => dist(e.x, e.y, dav.x, dav.y))) : Infinity;
      if (dav.isScared) { if (closestEnemyDist > DAV_SCARED_EXIT) dav.isScared = false; }
      else { if (closestEnemyDist < DAV_SCARED_ENTER) dav.isScared = true; }

      if (dav.isScared) {
        const ne = enemies.reduce((c, e) => { const d = dist(e.x, e.y, dav.x, dav.y); return d < c.d ? { d, e } : c; }, { d: Infinity, e: null as Enemy | null });
        if (ne.e && ne.d < DAV_SCARED_EXIT) {
          const fx = dav.x - ne.e.x, fy = dav.y - ne.e.y, fd = Math.sqrt(fx * fx + fy * fy);
          if (fd > DAV_SNAP_DIST) { dav.x += (fx / fd) * DAV_FLEE_SPEED; dav.y += (fy / fd) * DAV_FLEE_SPEED * 0.5; dav.dir = fx > 0 ? 'right' : 'left'; }
          dav.isWalking = true;
        } else dav.isWalking = false;
      } else {
        const tx = p.dir === 'right' ? p.x - 90 : p.x + 90, ty = p.y;
        const dx = tx - dav.x, dy = ty - dav.y, dt = Math.sqrt(dx * dx + dy * dy);
        if (dt > DAV_DEAD_ZONE) {
          dav.x += dx * DAV_FOLLOW_LERP; dav.y += dy * DAV_FOLLOW_LERP;
          if (Math.abs(tx - dav.x) < DAV_SNAP_DIST) dav.x = tx;
          if (Math.abs(ty - dav.y) < DAV_SNAP_DIST) dav.y = ty;
          dav.dir = dav.x < p.x ? 'right' : 'left'; dav.isWalking = true;
        } else dav.isWalking = false;
      }
      dav.x = clamp(dav.x, 30, WORLD_W - 30); dav.y = clamp(dav.y, FLOOR_MIN, FLOOR_MAX);

      dav.throwTimer++;
      dav.isThrowing = dav.throwTimer > 210;
      if (dav.throwTimer > 240) {
        dav.throwTimer = 0; dav.isThrowing = false;
        const r = Math.random();
        const it = r < 0.25 ? 'manual' : r < 0.5 ? 'compass' : r < 0.75 ? 'burger' : 'fries';
        foodRef.current.push({ id: uid(), x: dav.x + (dav.dir === 'right' ? 40 : -40), y: dav.y, type: it as FoodItem['type'], t: f, vy: -3, landed: false });
      }

      // ── Inimigos ──
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hurtTimer > 0) { e.hurtTimer--; e.x += e.kbx; e.y += e.kby || 0; e.kbx *= KNOCKBACK_DECAY; e.kby = (e.kby || 0) * KNOCKBACK_DECAY; e.x = clamp(e.x, 10, WORLD_W - 10); if (e.hurtTimer <= 0) e.hurt = false; continue; }
        if (e.punchTimer > 0) e.punchTimer--;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy);
        e.dir = dx > 0 ? 'right' : 'left';

        if (e.type === 'suka') {
          if (d < 200 && e.atkCd <= 0) {
            e.walking = false; e.stateTimer++;
            if (e.stateTimer === 1) textsRef.current.push({ id: uid(), text: '⚠ CUIDADO!', x: e.x, y: e.y - 70, color: '#e74c3c', size: 14, t: f });
            if (e.stateTimer > 50) {
              e.atkCd = 180; e.stateTimer = 0;
              textsRef.current.push({ id: uid(), text: 'KRAAAAAHH!!!', x: e.x, y: e.y - 40, color: '#3498db', size: 22, t: f });
              screenShakeRef.current = 12;
              spawnParticles(particles, 6, e.x, e.y - 30, 'rgba(52,152,219,0.6)', 'ring', 8, 25, 10);
              if (d < 250 && p.z < 20 && p.invincible <= 0) {
                p.hp -= 25; p.hurt = true; p.hurtTimer = 20; p.invincible = 40;
                p.vx = (dx > 0 ? -1 : 1) * 12; dav.x += (dx > 0 ? 1 : -1) * 120;
                p.combo = 0; p.comboTimer = 0;
                spawnParticles(particles, 8, p.x, p.y - 30 - p.z, '#e74c3c', 'hit', 5, 18, 6);
                textsRef.current.push({ id: uid(), text: '-25', x: p.x, y: p.y - 50 - p.z, color: '#ff2222', size: 22, t: f });
                if (p.hp <= 0) { setGameState('gameover'); return; }
              }
            }
          } else {
            e.stateTimer = 0; e.walking = true;
            if (d > 150) { e.x += (dx / d) * ENEMY_SPEED * 0.8; e.y += (dy / d) * ENEMY_SPEED * 0.5; }
            if (e.atkCd > 0) e.atkCd--;
            if (d < 60 && e.atkCd <= 0 && p.invincible <= 0 && p.z < 10) {
              e.atkCd = 60; e.punchTimer = 15; p.hp -= 15; p.hurt = true; p.hurtTimer = 15; p.invincible = 30; p.combo = 0; p.comboTimer = 0;
              spawnParticles(particles, 5, p.x, p.y - 30 - p.z, '#ff4444', 'hit', 3, 14, 5);
              textsRef.current.push({ id: uid(), text: '-15', x: p.x, y: p.y - 40 - p.z, color: '#ff4444', size: 16, t: f });
              if (p.hp <= 0) { setGameState('gameover'); return; }
            }
          }
        } else {
          const sm = e.type === 'fast' ? 1.5 : 1;
          if (d > 50) { e.x += (dx / d) * ENEMY_SPEED * sm; e.y += (dy / d) * ENEMY_SPEED * 0.7 * sm; }
          e.walking = d > 50; if (e.atkCd > 0) e.atkCd--;
          if (d < 50 && p.invincible <= 0 && p.z < 10 && !p.buffing && e.atkCd <= 0) {
            e.atkCd = e.type === 'fast' ? 30 : 50; e.punchTimer = 15;
            const dmg = e.type === 'fast' ? 8 : 10;
            p.hp -= dmg; p.hurt = true; p.hurtTimer = 15; p.invincible = 30; p.combo = 0; p.comboTimer = 0;
            spawnParticles(particles, 4, p.x, p.y - 30 - p.z, '#ff4444', 'hit', 3, 12, 4);
            textsRef.current.push({ id: uid(), text: `-${dmg}`, x: p.x, y: p.y - 40 - p.z, color: '#ff4444', size: 16, t: f });
            if (p.hp <= 0) { setGameState('gameover'); return; }
          }
        }

        const hx = Math.abs(e.x - p.x), hy = Math.abs(e.y - p.y);
        const facing = p.dir === 'right' ? e.x > p.x - 10 : e.x < p.x + 10;
        const pf = PUNCH_DURATION - p.atkTimer;
        if (p.attacking && pf >= PUNCH_ACTIVE[0] && pf <= PUNCH_ACTIVE[1] && hx < PUNCH_RANGE && hy < PUNCH_DEPTH && facing && !e.hitThisSwing) {
          e.hitThisSwing = true; e.hp -= PUNCH_DAMAGE; e.hurt = true; e.hurtTimer = 10;
          e.kbx = p.dir === 'right' ? 7 : -7; e.kby = (e.y - p.y) * 0.05;
          p.combo++; p.comboTimer = COMBO_TIMEOUT; p.hitstop = HITSTOP_FRAMES;
          spawnParticles(particles, 5, (p.x + e.x) / 2, e.y - 40, '#f1c40f', 'spark', 4, 12, 4);
          textsRef.current.push({ id: uid(), text: `-${PUNCH_DAMAGE}`, x: e.x, y: e.y - 50, color: '#f1c40f', size: 14, t: f });
        }
        if (p.buffing && p.buffTimer < (BUFA_DURATION - BUFA_ACTIVE_START) && hx < BUFA_RANGE && hy < BUFA_DEPTH && !e.hitThisSwing) {
          e.hitThisSwing = true; const dmg = e.type === 'suka' ? BUFA_DAMAGE_BOSS : BUFA_DAMAGE_NORMAL;
          e.hp -= dmg; e.hurt = true; e.hurtTimer = 18;
          e.kbx = (e.x - p.x) > 0 ? 14 : -14; e.kby = (e.y - p.y) * 0.08;
          p.combo++; p.comboTimer = COMBO_TIMEOUT; p.hitstop = HITSTOP_FRAMES + 2;
          spawnParticles(particles, 8, (p.x + e.x) / 2, e.y - 40, '#2ecc71', 'spark', 6, 16, 5);
          spawnParticles(particles, 3, (p.x + e.x) / 2, e.y - 40, '#2ecc71', 'ring', 2, 20, 8);
          textsRef.current.push({ id: uid(), text: `-${dmg}`, x: e.x, y: e.y - 50, color: '#2ecc71', size: 18, t: f });
        }
        if (e.hp <= 0) {
          enemies.splice(i, 1);
          spawnParticles(particles, 12, e.x, e.y - 30, e.type === 'suka' ? '#9b59b6' : '#f39c12', 'spark', 6, 25, 5);
          if (e.type === 'suka') { screenShakeRef.current = 20; setGameState('victory'); return; }
          else setScore(s => s + (p.combo >= 5 ? 150 : 100));
        }
      }

      // ── Itens ──
      const food = foodRef.current;
      for (let i = food.length - 1; i >= 0; i--) {
        const fo = food[i];
        if (!fo.landed) { fo.vy += 0.3; fo.y += fo.vy; if (fo.vy > 0) { fo.landed = true; fo.vy = 0; } }
        if (Math.abs(fo.x - p.x) < 32 && Math.abs(fo.y - p.y) < 28 && p.z < 15) {
          if (fo.type === 'manual' || fo.type === 'compass') {
            textsRef.current.push({ id: uid(), text: '💢 INÚTIL!', x: p.x, y: p.y - 55 - p.z, color: '#999', size: 14, t: f });
            p.atkTimer = 0; p.buffTimer = 0; p.attacking = false; p.buffing = false;
            spawnParticles(particles, 3, p.x, p.y - 20, '#666', 'dust', 2, 10, 3);
          } else {
            const heal = fo.type === 'burger' ? 25 : 15;
            p.hp = Math.min(MAX_HP, p.hp + heal);
            textsRef.current.push({ id: uid(), text: `+${heal} ❤`, x: p.x, y: p.y - 55 - p.z, color: '#2ecc71', size: 16, t: f });
            spawnParticles(particles, 5, fo.x, fo.y - 10, '#2ecc71', 'spark', 2, 15, 3);
          }
          food.splice(i, 1); continue;
        }
        if (f - fo.t > 600) food.splice(i, 1);
      }

      // ── Spawn ──
      spawnTimerRef.current++;
      const si = SPAWN_INTERVAL_MS / 16.67;
      if (score >= BOSS_SCORE_THRESHOLD && !bossSpawned.current) {
        bossSpawned.current = true;
        enemies.push({ id: uid(), type: 'suka', x: p.x + 400, y: p.y, z: 0, hp: 40, maxHp: 40, dir: 'left', walking: true, hurt: false, hurtTimer: 0, kbx: 0, kby: 0, atkCd: 60, stateTimer: 0, punchTimer: 0, hitThisSwing: false });
        screenShakeRef.current = 15;
        textsRef.current.push({ id: uid(), text: '☠ CHEFE: SUKA BARULHENTA!', x: p.x + 200, y: p.y - 100, color: '#9b59b6', size: 18, t: f });
      } else if (spawnTimerRef.current > si && enemies.length < MAX_ENEMIES && !bossSpawned.current) {
        spawnTimerRef.current = 0;
        const side = Math.random() < 0.5 ? p.x - BASE_W * 0.6 : p.x + BASE_W * 0.6;
        const tp: Enemy['type'] = Math.random() > 0.5 ? 'fast' : 'standard';
        const ehp = tp === 'fast' ? 2 : 4;
        enemies.push({ id: uid(), type: tp, x: clamp(side, 10, WORLD_W - 10), y: rng(FLOOR_MIN + 20, FLOOR_MAX - 20), z: 0, hp: ehp, maxHp: ehp, dir: side < p.x ? 'right' : 'left', walking: true, hurt: false, hurtTimer: 0, kbx: 0, kby: 0, atkCd: 30, stateTimer: 0, punchTimer: 0, hitThisSwing: false });
      }

      // ── Partículas ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i]; pt.x += pt.vx; pt.y += pt.vy;
        if (pt.type === 'dust' || pt.type === 'hit') pt.vy += 0.15;
        if (pt.type === 'spark') { pt.vx *= 0.92; pt.vy *= 0.92; }
        pt.life--; if (pt.life <= 0) particles.splice(i, 1);
      }
      textsRef.current = textsRef.current.filter(t => f - t.t < 55);
      tick(f); animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, score]);

  // ── RENDER ──
  const p = playerRef.current;
  const f = frameRef.current;
  const cam = cameraRef.current;
  const dav = davisRef.current;
  const isMoving = Math.abs(p.vx) > 0.3 || Math.abs(p.vy) > 0.3;

  const entities: Array<{ key: string; type: string; y: number; data: any }> = [
    { key: 'player', type: 'player', y: p.y, data: p },
    { key: 'davisaum', type: 'davisaum', y: dav.y, data: dav },
    ...enemiesRef.current.map(e => ({ key: e.id, type: 'enemy', y: e.y, data: e })),
    ...foodRef.current.map(fo => ({ key: fo.id, type: 'food', y: fo.y, data: fo })),
  ].sort((a, b) => a.y - b.y);

  const shakeX = screenShakeRef.current > 0 ? rng(-screenShakeRef.current, screenShakeRef.current) : 0;
  const shakeY = screenShakeRef.current > 0 ? rng(-screenShakeRef.current * 0.6, screenShakeRef.current * 0.6) : 0;
  const bossEnemy = enemiesRef.current.find(e => e.type === 'suka');

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808', fontFamily: '"Press Start 2P", monospace, system-ui', flexDirection: 'column', userSelect: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        *{box-sizing:border-box}body{margin:0;padding:0;overflow:hidden;background:#080808}
        @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}50%{opacity:0.8;transform:translateY(-20px) scale(1.1)}100%{opacity:0;transform:translateY(-45px) scale(0.8)}}
        @keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.1);opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        @keyframes smokeRise{0%{opacity:0.6;transform:scale(0.5) translateY(0)}100%{opacity:0;transform:scale(1.8) translateY(-40px)}}
        @keyframes sonicWave{0%{transform:scale(0.5);opacity:0.7}100%{transform:scale(2.5);opacity:0}}
        @keyframes itemFloat{0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)}}
      `}</style>

      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ color: '#f1c40f', fontSize: 12, letterSpacing: 4, textShadow: '0 0 10px rgba(241,196,15,0.3)' }}>⚡ Wallaçaum — Ameaça NutriControl ⚡</div>

        <div style={{ width: BASE_W, height: BASE_H, position: 'relative', overflow: 'hidden', border: '3px solid #333', boxShadow: '0 0 0 1px #111, 0 0 40px rgba(0,0,0,0.8), inset 0 0 80px rgba(0,0,0,0.3)', imageRendering: 'pixelated' }}>
          <div style={{ position: 'absolute', inset: -4, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${CENARIO_SPRITES.fundo_unico})`, backgroundRepeat: 'repeat-x', backgroundPositionX: -cam, backgroundSize: 'cover', backgroundPositionY: 'bottom' }} />

            {entities.map(ent => {
              const sx = ent.data.x - cam;
              if (sx < -120 || sx > BASE_W + 120) return null;
              if (ent.type === 'player') return <div key="player" style={{ position: 'absolute', left: sx - 70, top: ent.data.y - 155 - (ent.data.z || 0), zIndex: Math.floor(ent.data.y) }}><PixelWallacaum direction={ent.data.dir} isWalking={isMoving} isAttacking={ent.data.attacking} isBuffa={ent.data.buffing} isHurt={ent.data.hurt} jumpZ={ent.data.z || 0} landSquash={ent.data.landSquash} combo={ent.data.combo} /></div>;
              if (ent.type === 'davisaum') return <div key="davisaum" style={{ position: 'absolute', left: sx - 30, top: ent.data.y - 140, zIndex: Math.floor(ent.data.y) }}><PixelDavisaum direction={ent.data.dir} isWalking={ent.data.isWalking} isThrowing={ent.data.isThrowing} isScared={ent.data.isScared} frame={f} /></div>;
              if (ent.type === 'enemy') return <div key={ent.key} style={{ position: 'absolute', left: sx - 30, top: ent.data.y - 100, zIndex: Math.floor(ent.data.y) }}><PixelAgent type={ent.data.type} direction={ent.data.dir} isWalking={ent.data.walking} punchTimer={ent.data.punchTimer} stateTimer={ent.data.stateTimer} frame={f} isHurt={ent.data.hurt} hp={ent.data.hp} maxHp={ent.data.maxHp} /></div>;
              if (ent.type === 'food') return <div key={ent.key} style={{ position: 'absolute', left: sx - FOOD_SIZE / 2, top: ent.data.y - FOOD_SIZE - 8, zIndex: Math.floor(ent.data.y) - 1 }}><FoodItemComp type={ent.data.type} landed={ent.data.landed} /></div>;
              return null;
            })}

            <ParticleRenderer particles={particlesRef.current} cam={cam} />
            {textsRef.current.map(ft => <FloatingText key={ft.id} text={ft.text} x={ft.x - cam - 10} y={ft.y} color={ft.color} size={ft.size} />)}
          </div>

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9990, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)', mixBlendMode: 'multiply' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9991, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)' }} />

          <HpBar hp={p.hp} maxHp={MAX_HP} />
          <ScoreDisplay score={score} combo={p.combo} />
          {bossEnemy && <BossHpBar enemy={bossEnemy} />}
          <MusicButton muted={muted} onToggle={toggleMute} />

          {gameState === 'title' && <TitleScreen onStart={reset} />}
          {gameState === 'gameover' && <GameOverScreen score={score} onRetry={reset} />}
          {gameState === 'victory' && <VictoryScreen score={score} onRetry={reset} />}
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 4, alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gridTemplateRows: 'repeat(3, 50px)', gap: 3 }}>
            <div /><MobileBtn label="▲" hint="W" k="arrowup" keysRef={keysRef} /><div />
            <MobileBtn label="◀" hint="A" k="arrowleft" keysRef={keysRef} /><div /><MobileBtn label="▶" hint="D" k="arrowright" keysRef={keysRef} />
            <div /><MobileBtn label="▼" hint="S" k="arrowdown" keysRef={keysRef} /><div />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <MobileBtn label="SOCO" hint="X" k="x" keysRef={keysRef} wide color="#c0392b" />
            <MobileBtn label="BUFA" hint="C" k="c" keysRef={keysRef} wide color="#27ae60" />
            <MobileBtn label="PULO" hint="Z/Space" k="z" keysRef={keysRef} wide color="#2980b9" />
          </div>
        </div>

        <div style={{ color: '#555', fontSize: 9, textAlign: 'center', letterSpacing: 1 }}>SETAS/WASD · X SOCO · C BUFA CELESTE · Z/ESPAÇO PULO</div>
      </div>
    </div>
  );
}
