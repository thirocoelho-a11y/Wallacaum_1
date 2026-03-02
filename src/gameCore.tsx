// ═══════════════════════════════════════════════════════
//  gameCore.ts — Tipos, Constantes, Utilidades e Componentes Compartilhados
// ═══════════════════════════════════════════════════════
import React from 'react';
import { WALLACAUM_SPRITES, DAVISAUM_SPRITES, INIMIGOS_SPRITES } from './sprites';
import { FASE2_SPRITES } from './spritesFase2';

// ─────────────────────────────────────────────────────
//  CONSTANTES
// ─────────────────────────────────────────────────────
export const BASE_W = 800;
export const BASE_H = 450;
export const WORLD_W = 3200;
export const FLOOR_MIN = BASE_H - 100;
export const FLOOR_MAX = BASE_H - 18;

export const GRAVITY = 0.65;
export const JUMP_FORCE = 9;
export const JUMP_CUT = 0.4;
export const MAX_JUMP_Z = 50;
export const PLAYER_ACCEL = 0.55;
export const PLAYER_DECEL = 0.78;
export const PLAYER_MAX_SPEED = 4.0;
export const COYOTE_TIME = 6;
export const LAND_SQUASH_FRAMES = 6;

export const PUNCH_RANGE = 85;
export const PUNCH_DEPTH = 45;
export const PUNCH_DAMAGE = 1;
export const PUNCH_DURATION = 18;
export const PUNCH_ACTIVE: [number, number] = [4, 12];
export const BUFA_RANGE = 170;
export const BUFA_DEPTH = 85;
export const BUFA_DAMAGE_NORMAL = 3;
export const BUFA_DAMAGE_BOSS = 5;
export const BUFA_DURATION = 50;
export const BUFA_ACTIVE_START = 12;
export const HITSTOP_FRAMES = 4;
export const KNOCKBACK_DECAY = 0.82;
export const COMBO_TIMEOUT = 90;

export const ENEMY_SPEED = 1.3;
export const SPAWN_INTERVAL_MS = 3500;
export const MAX_ENEMIES = 7;
export const MAX_HP = 100;
export const FOOD_SIZE = 28;
export const MAX_PARTICLES = 60;

export const DAV_SCARED_ENTER = 130;
export const DAV_SCARED_EXIT = 220;
export const DAV_FLEE_SPEED = 2.5;
export const DAV_FOLLOW_LERP = 0.08;
export const DAV_DEAD_ZONE = 6;
export const DAV_SNAP_DIST = 2;

export const IDLE_EAT_FRAMES = 120;
export const IDLE_EAT_DURATION = 90;

export const SPRITE_PLAYER_W = 100;
export const SPRITE_PLAYER_H = 110;
export const SPRITE_PLAYER_OFFSET_Y = 125;
export const SPRITE_DAVIS_W = 110;
export const SPRITE_DAVIS_OFFSET_Y = 115;
export const SPRITE_ENEMY_STD_W = 120;
export const SPRITE_ENEMY_BOSS_W = 140;
export const SPRITE_ENEMY_FURIO_W = 150;
export const SPRITE_ENEMY_OFFSET_Y = 115;

// ─────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────
export type EnemyType = 'standard' | 'fast' | 'suka' | 'seguranca' | 'cientista' | 'furio';
export type GameState = 'title' | 'playing' | 'gameover' | 'victory' | 'phase_transition';

export interface Player {
  x: number; y: number; vx: number; vy: number;
  z: number; vz: number; hp: number; dir: 'left' | 'right';
  attacking: boolean; buffing: boolean;
  hurt: boolean; hurtTimer: number;
  atkTimer: number; buffTimer: number; invincible: number;
  coyoteTimer: number; landSquash: number; wasGrounded: boolean;
  combo: number; comboTimer: number; hitstop: number;
  idleTimer: number; eating: boolean; eatTimer: number;
}

export interface Enemy {
  id: string; type: EnemyType;
  x: number; y: number; z: number;
  hp: number; maxHp: number; dir: 'left' | 'right';
  walking: boolean; hurt: boolean;
  hurtTimer: number; kbx: number; kby: number;
  atkCd: number; stateTimer: number; punchTimer: number;
  hitThisSwing: boolean;
  charging?: boolean; chargeDir?: number;
}

export interface FoodItem { id: string; x: number; y: number; type: 'burger' | 'fries' | 'manual' | 'compass'; t: number; vy: number; landed: boolean; }
export interface Particle { id: string; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; type: 'dust' | 'hit' | 'spark' | 'ring'; }
export interface FloatingTextData { id: string; text: string; x: number; y: number; color: string; size: number; t: number; }
export interface Davisaum { x: number; y: number; dir: 'left' | 'right'; throwTimer: number; isWalking: boolean; isThrowing: boolean; isScared: boolean; }

// Configuração por fase
export interface PhaseConfig {
  phase: number;
  bgImage: string;
  bossThreshold: number;
  spawnIntervalMs: number;
  spawnEnemy: () => { type: EnemyType; hp: number };
  spawnBoss: (px: number, py: number, f: number) => Enemy;
  bossName: string;
  bossColor: string;
  bossAnnounce: string;
  onBossDeath: 'phase_transition' | 'victory';
  overlay?: boolean;
}

export const DEFAULT_PLAYER: Player = {
  x: 200, y: 380, vx: 0, vy: 0, z: 0, vz: 0, hp: MAX_HP, dir: 'right',
  attacking: false, buffing: false, hurt: false, hurtTimer: 0,
  atkTimer: 0, buffTimer: 0, invincible: 0,
  coyoteTimer: 0, landSquash: 0, wasGrounded: true,
  combo: 0, comboTimer: 0, hitstop: 0,
  idleTimer: 0, eating: false, eatTimer: 0,
};
export const DEFAULT_DAVIS: Davisaum = { x: 100, y: 380, dir: 'right', throwTimer: 0, isWalking: false, isThrowing: false, isScared: false };

// ─────────────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────────────
export const rng = (a: number, b: number) => Math.random() * (b - a) + a;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
let _id = 0;
export const uid = () => `u${++_id}`;
export const resetUid = () => { _id = 0; };
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);

export function spawnParticles(arr: Particle[], count: number, x: number, y: number, color: string, type: Particle['type'] = 'hit', spread = 4, life = 20, size = 4) {
  for (let i = 0; i < count && arr.length < MAX_PARTICLES; i++) {
    arr.push({ id: uid(), x, y, vx: rng(-spread, spread), vy: rng(-spread * 0.8, -0.5), life, maxLife: life, color, size: rng(size * 0.5, size * 1.2), type });
  }
}

// ─────────────────────────────────────────────────────
//  SPRITES helpers
// ─────────────────────────────────────────────────────
export function getEnemySprite(type: EnemyType, isWalking: boolean, isPunching: boolean, isShouting: boolean, isSuper = false, isCharging = false) {
  if (type === 'seguranca') {
    if (isPunching) return FASE2_SPRITES.operario_socando;
    if (isWalking) return Math.floor(Date.now() / 200) % 2 === 0 ? FASE2_SPRITES.operario_andando1 : FASE2_SPRITES.operario_andando2;
    return FASE2_SPRITES.operario_parado;
  }
  if (type === 'cientista') {
    if (isPunching) return FASE2_SPRITES.cientista_socando;
    if (isWalking) return Math.floor(Date.now() / 160) % 2 === 0 ? FASE2_SPRITES.cientista_andando1 : FASE2_SPRITES.cientista_andando2;
    return FASE2_SPRITES.cientista_parado;
  }
  if (type === 'furio') {
    if (isSuper) {
      if (isCharging || isShouting) return FASE2_SPRITES.furia_super_carga;
      if (isPunching) return FASE2_SPRITES.furia_super_socando;
      return FASE2_SPRITES.furia_super_parado;
    }
    if (isCharging || isShouting) return FASE2_SPRITES.furia_carga;
    if (isPunching) return FASE2_SPRITES.furia_socando;
    if (isWalking) return Math.floor(Date.now() / 180) % 2 === 0 ? FASE2_SPRITES.furia_andando1 : FASE2_SPRITES.furia_andando2;
    return FASE2_SPRITES.furia_parado;
  }
  if (type === 'suka') {
    if (isShouting) return INIMIGOS_SPRITES.suka_gritando;
    if (isPunching) return INIMIGOS_SPRITES.suka_socando;
    if (isWalking) return Math.floor(Date.now() / 200) % 2 === 0 ? INIMIGOS_SPRITES.suka_andando : INIMIGOS_SPRITES.suka_parada;
    return INIMIGOS_SPRITES.suka_parada;
  }
  if (type === 'fast') {
    if (isPunching) return INIMIGOS_SPRITES.capanga_preto_socando;
    if (isWalking) return Math.floor(Date.now() / 180) % 2 === 0 ? INIMIGOS_SPRITES.capanga_preto_andando : INIMIGOS_SPRITES.capanga_preto_parado;
    return INIMIGOS_SPRITES.capanga_preto_parado;
  }
  if (isPunching) return INIMIGOS_SPRITES.capanga_loiro_socando;
  if (isWalking) return Math.floor(Date.now() / 200) % 2 === 0 ? INIMIGOS_SPRITES.capanga_loiro_andando : INIMIGOS_SPRITES.capanga_loiro_parado;
  return INIMIGOS_SPRITES.capanga_loiro_parado;
}

export function getEnemyWidth(type: EnemyType) {
  if (type === 'furio') return SPRITE_ENEMY_FURIO_W;
  if (type === 'suka') return SPRITE_ENEMY_BOSS_W;
  return SPRITE_ENEMY_STD_W;
}
export function isBossType(type: EnemyType) { return type === 'suka' || type === 'furio'; }

// ─────────────────────────────────────────────────────
//  COMPONENTES VISUAIS
// ─────────────────────────────────────────────────────
export function PixelWallacaum({ direction, isWalking, isAttacking, isBuffa, isHurt, isEating, jumpZ, landSquash, combo }: {
  direction: string; isWalking: boolean; isAttacking: boolean; isBuffa: boolean; isHurt: boolean; isEating: boolean; jumpZ: number; landSquash: number; combo: number;
}) {
  const flip = direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  let spr = WALLACAUM_SPRITES.parado;
  if (isHurt) spr = WALLACAUM_SPRITES.dor;
  else if (isBuffa) spr = WALLACAUM_SPRITES.bufa;
  else if (isAttacking) spr = WALLACAUM_SPRITES.soco;
  else if (jumpZ > 0) spr = WALLACAUM_SPRITES.pulando;
  else if (isWalking) spr = Math.floor(Date.now() / 140) % 2 === 0 ? WALLACAUM_SPRITES.walk1 : WALLACAUM_SPRITES.walk2;
  else if (isEating) spr = WALLACAUM_SPRITES.comendo;

  let sx = 1, sy = 1;
  if (jumpZ > 8) { sx = 0.92; sy = 1.08; }
  else if (landSquash > 0) { const t = landSquash / LAND_SQUASH_FRAMES; sx = 1 + t * 0.12; sy = 1 - t * 0.1; }
  const flt = isHurt ? 'drop-shadow(0 0 12px rgba(255,50,50,0.9)) brightness(1.8) sepia(1) hue-rotate(-50deg) saturate(4)' : 'drop-shadow(2px 3px 0px rgba(0,0,0,0.55))';
  const shS = clamp(1 - jumpZ / 120, 0.3, 1);
  const shO = clamp(0.5 - jumpZ / 200, 0.1, 0.5);
  const eatBob = isEating ? Math.sin(Date.now() * 0.008) * 2 : 0;

  return (
    <div style={{ transform: `${flip} scaleX(${sx}) scaleY(${sy})`, transformOrigin: 'bottom center', position: 'relative', width: SPRITE_PLAYER_W, height: SPRITE_PLAYER_H, transition: 'transform 0.04s' }}>
      {isBuffa && <div style={{ position: 'absolute', left: -40, top: -15, width: 210, height: 180, pointerEvents: 'none', zIndex: -1 }}>
        <div style={{ position: 'absolute', left: 25, top: 35, width: 100, height: 85, borderRadius: '60% 40% 50% 60%', background: 'radial-gradient(ellipse, rgba(80,220,160,0.5) 0%, rgba(46,204,113,0.2) 40%, transparent 70%)', filter: 'blur(8px)', animation: 'smokeRise 0.8s infinite' }} />
        <div style={{ position: 'absolute', left: 8, top: 15, width: 120, height: 110, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(46,204,113,0.15) 0%, transparent 70%)', filter: 'blur(12px)', animation: 'pulse 0.3s infinite alternate' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 8, width: 210, height: 40, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(50,200,130,0.45) 0%, transparent 80%)', filter: 'blur(6px)', animation: 'pulse 0.4s infinite alternate' }} />
      </div>}
      <img src={spr} alt="W" style={{ position: 'absolute', left: '50%', transform: `translateX(-50%) translateY(${eatBob}px)`, bottom: 0, width: SPRITE_PLAYER_W, height: SPRITE_PLAYER_H, objectFit: 'contain', imageRendering: 'pixelated', pointerEvents: 'none', filter: flt, opacity: isHurt ? (Math.floor(Date.now() / 60) % 2 === 0 ? 0.4 : 0.9) : 1 }} />
      {isEating && <>
        <div style={{ position: 'absolute', top: 30 + Math.sin(Date.now() * 0.01) * 5, right: 15, width: 4, height: 4, background: '#d4a017', borderRadius: '50%', opacity: 0.8, animation: 'crumbFall 0.8s infinite linear' }} />
        <div style={{ position: 'absolute', top: 35 + Math.cos(Date.now() * 0.012) * 4, right: 25, width: 3, height: 3, background: '#c0392b', borderRadius: '50%', opacity: 0.7, animation: 'crumbFall 1.1s 0.3s infinite linear' }} />
        <div style={{ position: 'absolute', top: 32 + Math.sin(Date.now() * 0.009) * 6, right: 8, width: 3, height: 3, background: '#27ae60', borderRadius: '50%', opacity: 0.6, animation: 'crumbFall 0.9s 0.5s infinite linear' }} />
        <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', fontSize: 18, animation: 'pulse 0.5s infinite alternate', filter: 'drop-shadow(1px 1px 0 #000)' }}>🍔</div>
      </>}
      {isBuffa && <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', color: '#2ecc71', fontWeight: 900, fontSize: 11, letterSpacing: 2, textShadow: '2px 2px 0 #000, -1px -1px 0 #000', whiteSpace: 'nowrap', animation: 'pulse 0.3s infinite alternate' }}>⚡ BUFA CELESTE! ⚡</div>}
      {combo >= 3 && <div style={{ position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)', color: combo >= 8 ? '#e74c3c' : combo >= 5 ? '#f39c12' : '#f1c40f', fontWeight: 900, fontSize: combo >= 8 ? 16 : 12, textShadow: '2px 2px 0 #000, -1px -1px 0 #000', whiteSpace: 'nowrap', animation: 'pulse 0.2s infinite alternate' }}>{combo}x COMBO!</div>}
      <div style={{ position: 'absolute', bottom: -6, left: '15%', width: `${70 * shS}%`, height: 10, background: `rgba(0,0,0,${shO})`, borderRadius: '50%', transform: `scaleX(${shS})`, transformOrigin: 'center' }} />
    </div>
  );
}

export function PixelDavisaum({ direction, isWalking, isThrowing, isScared, frame }: { direction: string; isWalking: boolean; isThrowing: boolean; isScared: boolean; frame: number }) {
  const flip = direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  let spr = DAVISAUM_SPRITES.parado;
  if (isScared) spr = DAVISAUM_SPRITES.medo; else if (isThrowing) spr = DAVISAUM_SPRITES.jogando; else if (isWalking) spr = Math.floor(Date.now() / 200) % 2 === 0 ? DAVISAUM_SPRITES.walk : DAVISAUM_SPRITES.parado;
  const bob = isWalking && !isScared && !isThrowing ? Math.sin(frame * 0.4) * 2 : 0;
  const sk = isScared ? Math.sin(frame * 1.5) * 2 : 0;
  return (
    <div style={{ transform: `${flip} translateX(${sk}px)`, position: 'relative', width: 90, height: SPRITE_PLAYER_H }}>
      <div style={{ position: 'absolute', bottom: -6, left: 18, width: 54, height: 9, background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }} />
      {isScared && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontSize: 14, animation: 'pulse 0.3s infinite alternate' }}>😰</div>}
      <img src={spr} alt="D" style={{ position: 'absolute', bottom: bob, left: '50%', transform: 'translateX(-50%)', width: SPRITE_DAVIS_W, height: SPRITE_PLAYER_H, objectFit: 'contain', imageRendering: 'pixelated', pointerEvents: 'none' }} />
    </div>
  );
}

export function PixelAgent({ type, direction, isWalking, punchTimer, stateTimer, frame, isHurt, hp, maxHp, charging }: {
  type: EnemyType; direction: string; isWalking: boolean; punchTimer: number; stateTimer: number; frame: number; isHurt: boolean; hp: number; maxHp: number; charging?: boolean;
}) {
  const flip = direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  const isPunching = punchTimer > 0; const isShouting = stateTimer > 0;
  const hpPct = hp / maxHp;
  const isSuper = type === 'furio' && hpPct < 0.35;
  const spr = getEnemySprite(type, isWalking || !!charging, isPunching, isShouting, isSuper, !!charging);
  const sprFilter = isHurt ? 'brightness(2.5) sepia(1) hue-rotate(-50deg) saturate(4)' : '';
  const ew = getEnemyWidth(type);
  const bob = isWalking && !isPunching && !isShouting ? Math.sin(frame * 0.3) * 2 : 0;
  const hurtSquash = isHurt ? 'scaleX(1.08) scaleY(0.92)' : '';
  const shakeX = isHurt ? rng(-3, 3) : 0;
  const hpColor = type === 'furio' ? `hsl(${hpPct * 30 + 5}, 90%, ${40 + hpPct * 15}%)` : type === 'suka' ? `hsl(${280 + hpPct * 20}, 60%, ${45 + hpPct * 15}%)` : `hsl(${hpPct * 40}, 75%, 50%)`;
  const chargeGlow = charging ? 'drop-shadow(0 0 15px rgba(255,100,0,0.8)) drop-shadow(0 0 30px rgba(255,50,0,0.4))' : '';
  const superGlow = isSuper && !isHurt ? 'drop-shadow(0 0 10px rgba(80,150,255,0.7)) drop-shadow(0 0 25px rgba(80,100,255,0.3))' : '';
  
  // AUMENTA A ESCALA DOS CHEFES (Ajuste o 1.5 ou 1.3 se precisar deles maiores ou menores)
  const bossScale = type === 'furio' ? 'scale(1.5)' : type === 'suka' ? 'scale(1.3)' : 'scale(1)';

  return (
    <div style={{ transform: `${flip} translateX(${shakeX}px) ${hurtSquash}`, transformOrigin: 'bottom center', transition: 'filter 0.08s', position: 'relative', width: 90, height: SPRITE_PLAYER_H }}>
      <div style={{ position: 'absolute', bottom: -6, left: 12, width: 56, height: 9, background: isBossType(type) ? 'rgba(100,20,120,0.4)' : 'rgba(0,0,0,0.35)', borderRadius: '50%' }} />
      {type === 'suka' && isShouting && (<><div style={{ position: 'absolute', top: 12, left: direction === 'right' ? 55 : -70, width: 90, height: 90, border: '4px solid rgba(52,152,219,0.5)', borderRadius: '50%', animation: 'sonicWave 0.3s infinite', pointerEvents: 'none' }} /><div style={{ position: 'absolute', top: 0, left: direction === 'right' ? 35 : -90, width: 120, height: 120, border: '3px solid rgba(52,152,219,0.25)', borderRadius: '50%', animation: 'sonicWave 0.3s 0.1s infinite', pointerEvents: 'none' }} /></>)}
      {type === 'furio' && isShouting && (<><div style={{ position: 'absolute', top: 8, left: direction === 'right' ? 45 : -80, width: 100, height: 100, border: '4px solid rgba(255,80,0,0.6)', borderRadius: '50%', animation: 'sonicWave 0.3s infinite', pointerEvents: 'none' }} /><div style={{ position: 'absolute', top: -4, left: direction === 'right' ? 25 : -100, width: 140, height: 140, border: '3px solid rgba(255,120,0,0.3)', borderRadius: '50%', animation: 'sonicWave 0.3s 0.15s infinite', pointerEvents: 'none' }} /></>)}
      {charging && <div style={{ position: 'absolute', bottom: 0, left: direction === 'right' ? -30 : 35, width: 60, height: 25, background: 'radial-gradient(ellipse, rgba(255,100,0,0.4), transparent)', borderRadius: '50%', filter: 'blur(4px)', animation: 'pulse 0.15s infinite alternate' }} />}
      
      <img src={spr} alt="E" style={{ position: 'absolute', bottom: bob, left: '50%', transform: `translateX(-50%) ${bossScale}`, transformOrigin: 'bottom center', width: ew, height: SPRITE_PLAYER_H, objectFit: 'contain', imageRendering: 'pixelated', opacity: isHurt ? (Math.floor(Date.now() / 50) % 2 === 0 ? 0.5 : 1) : 1, filter: `${sprFilter} ${chargeGlow} ${superGlow}` }} />
      
      <div style={{ position: 'absolute', top: -16, left: 5, width: 70, height: 7, background: '#1a1a1a', border: '1.5px solid #333', borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
        <div style={{ width: `${hpPct * 100}%`, height: '100%', background: `linear-gradient(180deg, ${hpColor}, ${hpColor}dd)`, transition: 'width 0.2s ease-out', boxShadow: hpPct < 0.3 ? `0 0 6px ${hpColor}` : 'none' }} />
      </div>
      {type === 'suka' && <div style={{ position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)', color: '#9b59b6', fontWeight: 900, fontSize: 8, letterSpacing: 1, textShadow: '1px 1px 0 #000', whiteSpace: 'nowrap' }}>SUKA BARULHENTA</div>}
      {type === 'furio' && <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', color: isSuper ? '#4488ff' : '#ff4500', fontWeight: 900, fontSize: 8, letterSpacing: 1, textShadow: `1px 1px 0 #000, 0 0 8px ${isSuper ? 'rgba(80,150,255,0.6)' : 'rgba(255,69,0,0.5)'}`, whiteSpace: 'nowrap', animation: isSuper ? 'pulse 0.2s infinite alternate' : 'none' }}>{isSuper ? '💀 FURIA MÁXIMA! 💀' : '⚡ FURIO ⚡'}</div>}
    </div>
  );
}

export function FoodItemComp({ type, landed }: { type: string; landed: boolean }) {
  const b = !landed ? 'translateY(-4px)' : '';
  if (type === 'burger') return <div style={{ fontSize: 24, transform: b, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))', animation: 'itemFloat 1.5s infinite ease-in-out' }}>🍔</div>;
  if (type === 'fries') return <div style={{ fontSize: 24, transform: b, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))', animation: 'itemFloat 1.8s infinite ease-in-out' }}>🍟</div>;
  if (type === 'manual') return <div style={{ width: 22, height: 26, background: 'linear-gradient(135deg, #3498db, #2980b9)', border: '2px solid #1a6fa0', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, animation: 'itemFloat 2s infinite ease-in-out' }}>📘</div>;
  if (type === 'compass') return <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg, #bdc3c7, #95a5a6)', border: '2px solid #7f8c8d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, animation: 'itemFloat 1.7s infinite ease-in-out' }}>🧭</div>;
  return null;
}
export function FloatingText({ text, x, y, color, size = 16 }: { text: string; x: number; y: number; color: string; size?: number }) {
  return <div style={{ position: 'absolute', left: x, top: y, color, fontWeight: 900, fontSize: size, fontFamily: '"Press Start 2P", monospace', textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 0 0 8px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 9999, animation: 'floatUp 0.9s ease-out forwards' }}>{text}</div>;
}
export function ParticleRenderer({ particles, cam }: { particles: Particle[]; cam: number }) {
  return (<>{particles.map(p => { const alpha = p.life / p.maxLife; const sx = p.x - cam; if (sx < -20 || sx > BASE_W + 20) return null; if (p.type === 'ring') { const sc = 1 + (1 - alpha) * 2; return <div key={p.id} style={{ position: 'absolute', left: sx - 20, top: p.y - 20, width: 40, height: 40, borderRadius: '50%', border: `3px solid ${p.color}`, opacity: alpha * 0.6, transform: `scale(${sc})`, pointerEvents: 'none', zIndex: 9998 }} />; } return <div key={p.id} style={{ position: 'absolute', left: sx - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size, background: p.color, borderRadius: p.type === 'spark' ? '1px' : '50%', opacity: alpha, transform: p.type === 'spark' ? `rotate(${p.vx * 20}deg)` : '', boxShadow: `0 0 ${p.size}px ${p.color}`, pointerEvents: 'none', zIndex: 9998 }} />; })}</>);
}

// ─────────────────────────────────────────────────────
//  TOUCH CONTROLS
// ─────────────────────────────────────────────────────
export function TouchDpad({ keysRef }: { keysRef: React.MutableRefObject<Record<string, boolean>> }) {
  const h = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); keysRef.current[k] = true; },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = false; },
    onPointerLeave: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = false; },
    onPointerCancel: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const S: React.CSSProperties = { width: 52, height: 52, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 20, fontWeight: 900, touchAction: 'none', userSelect: 'none' };
  return (
    <div style={{ position: 'absolute', bottom: 14, left: 14, zIndex: 10020, display: 'grid', gridTemplateColumns: 'repeat(3, 52px)', gridTemplateRows: 'repeat(3, 52px)', gap: 2 }}>
      <div /><div style={S} {...h('arrowup')}>▲</div><div />
      <div style={S} {...h('arrowleft')}>◀</div><div style={{ ...S, background: 'transparent', border: '1px solid rgba(255,255,255,0.04)' }} /><div style={S} {...h('arrowright')}>▶</div>
      <div /><div style={S} {...h('arrowdown')}>▼</div><div />
    </div>
  );
}
export function TouchActions({ keysRef }: { keysRef: React.MutableRefObject<Record<string, boolean>> }) {
  const h = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); keysRef.current[k] = true; },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = false; },
    onPointerLeave: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = false; },
    onPointerCancel: (e: React.PointerEvent) => { e.preventDefault(); keysRef.current[k] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const C = (color: string, sz: number): React.CSSProperties => ({ width: sz, height: sz, background: `radial-gradient(circle at 40% 35%, ${color}33, ${color}15 70%, transparent)`, border: `2px solid ${color}44`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, color: `${color}aa`, touchAction: 'none', userSelect: 'none' });
  return (
    <div style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 10020, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={C('#3498db', 50)} {...h('z')}><span style={{ fontSize: 16 }}>⬆</span><span style={{ fontSize: 6, fontWeight: 900, fontFamily: '"Press Start 2P", monospace' }}>PULO</span></div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={C('#e74c3c', 66)} {...h('x')}><span style={{ fontSize: 20 }}>👊</span><span style={{ fontSize: 6, fontWeight: 900, fontFamily: '"Press Start 2P", monospace' }}>SOCO</span></div>
        <div style={C('#2ecc71', 66)} {...h('c')}><span style={{ fontSize: 20 }}>💨</span><span style={{ fontSize: 6, fontWeight: 900, fontFamily: '"Press Start 2P", monospace' }}>BUFA</span></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────────────
export function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = (hp / maxHp) * 100; const c = hp > 60 ? '#2ecc71' : hp > 30 ? '#f1c40f' : '#e74c3c';
  return <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10000, background: 'rgba(0,0,0,0.65)', padding: '6px 10px', borderRadius: 5, border: '1.5px solid #44444488' }}><div style={{ color: '#f1c40f', fontSize: 7, marginBottom: 3, letterSpacing: 1.5, fontWeight: 900 }}>⚡ WALLAÇAUM</div><div style={{ width: 100, height: 10, background: '#222', border: '1.5px solid #444', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(180deg, ${c}, ${c}bb)`, transition: 'width 0.25s ease-out' }} /></div><div style={{ color: '#888', fontSize: 6, marginTop: 2, textAlign: 'right' }}>{Math.max(0, Math.round(hp))}/{maxHp}</div></div>;
}
export function ScoreDisplay({ score, combo, phase }: { score: number; combo: number; phase: number }) {
  return <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10000, background: 'rgba(0,0,0,0.65)', padding: '6px 10px', borderRadius: 5, border: '1.5px solid #44444488', textAlign: 'right' }}>
    {phase === 2 && <div style={{ color: '#ff6600', fontSize: 6, fontWeight: 900, letterSpacing: 1, marginBottom: 2 }}>FASE 2 — FÁBRICA</div>}
    <div style={{ color: '#fff', fontSize: 12, fontWeight: 900, fontFamily: '"Press Start 2P", monospace' }}>{String(score).padStart(6, '0')}</div>
    {combo >= 2 && <div style={{ color: combo >= 8 ? '#e74c3c' : combo >= 5 ? '#f39c12' : '#f1c40f', fontSize: 7, fontWeight: 900, marginTop: 2, animation: 'pulse 0.3s infinite alternate' }}>COMBO x{combo}</div>}
  </div>;
}
export function BossHpBar({ enemy }: { enemy: Enemy | undefined }) {
  if (!enemy) return null;
  const pct = (enemy.hp / enemy.maxHp) * 100;
  const isFurio = enemy.type === 'furio'; const col = isFurio ? '#ff4500' : '#9b59b6';
  const bg = isFurio ? 'linear-gradient(90deg, #cc3300, #ff4500, #ff8844)' : 'linear-gradient(90deg, #8e44ad, #9b59b6, #c39bd3)';
  const name = isFurio ? '🔥 FURIO — CHEFE NUTRICONTROL 🔥' : '☠ SUKA BARULHENTA ☠';
  return <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, width: 220, background: 'rgba(0,0,0,0.75)', padding: '4px 8px', borderRadius: 4, border: `1.5px solid ${col}` }}><div style={{ color: col, fontSize: 6, fontWeight: 900, letterSpacing: 1, marginBottom: 2, textAlign: 'center' }}>{name}</div><div style={{ width: '100%', height: 6, background: '#222', border: '1px solid #555', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: bg, transition: 'width 0.3s ease-out' }} /></div></div>;
}
export function MusicButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return <div onClick={onToggle} onPointerDown={e => e.stopPropagation()} style={{ position: 'absolute', top: 8, left: 130, zIndex: 10001, background: 'rgba(0,0,0,0.5)', border: `1px solid ${muted ? '#e74c3c44' : '#2ecc7144'}`, borderRadius: 12, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 11 }}>{muted ? '🔇' : '🔊'}</span></div>;
}

// ─────────────────────────────────────────────────────
//  TELAS
// ─────────────────────────────────────────────────────
export function TitleScreen({ onStart }: { onStart: () => void }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.95) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 28, color: '#f1c40f', fontWeight: 900, fontFamily: '"Press Start 2P", monospace', textShadow: '3px 3px 0 #c0392b, 5px 5px 0 rgba(0,0,0,0.5)', animation: 'pulse 1.5s infinite alternate', letterSpacing: 2 }}>WALLAÇAUM</div>
    <div style={{ fontSize: 9, color: '#e74c3c', marginTop: 6, letterSpacing: 2, fontWeight: 700, textShadow: '1px 1px 0 #000' }}>A CONSPIRAÇÃO DO SUPLEMENTO</div>
    <div onClick={onStart} style={{ marginTop: 22, padding: '12px 36px', background: 'linear-gradient(180deg, #e74c3c, #c0392b)', color: '#fff', fontWeight: 900, fontSize: 12, border: '3px solid #fff', borderRadius: 4, cursor: 'pointer', letterSpacing: 2, boxShadow: '0 4px 20px rgba(231,76,60,0.4)', animation: 'pulse 1.2s infinite alternate' }}>PRESS START</div>
  </div>;
}
export function PhaseTransitionScreen({ score, onContinue }: { score: number; onContinue: () => void }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(20,10,0,0.9) 0%, rgba(0,0,0,0.98) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ color: '#2ecc71', fontSize: 14, fontWeight: 900, letterSpacing: 3, textShadow: '0 0 15px rgba(46,204,113,0.5)' }}>✅ SUKA BARULHENTA DERROTADA!</div>
    <div style={{ color: '#888', fontSize: 9, marginTop: 8 }}>SCORE: {score}</div>
    <div style={{ width: 300, height: 2, background: 'linear-gradient(90deg, transparent, #ff4500, transparent)', margin: '18px 0' }} />
    <div style={{ fontSize: 22, color: '#ff4500', fontWeight: 900, fontFamily: '"Press Start 2P", monospace', textShadow: '3px 3px 0 #000, 0 0 20px rgba(255,69,0,0.4)', animation: 'pulse 1s infinite alternate', letterSpacing: 2 }}>FASE 2</div>
    <div style={{ fontSize: 10, color: '#ff8844', marginTop: 6, letterSpacing: 2, fontWeight: 700, textShadow: '1px 1px 0 #000' }}>FÁBRICA NUTRICONTROL</div>
    <div style={{ color: '#aaa', fontSize: 8, marginTop: 12, textAlign: 'center', maxWidth: 350, lineHeight: 1.6 }}>Wallaçaum invade a fábrica de suplementos.<br />FURIO, o chefe da NutriControl, está esperando.</div>
    <div onClick={onContinue} style={{ marginTop: 20, padding: '12px 36px', background: 'linear-gradient(180deg, #ff4500, #cc3300)', color: '#fff', fontWeight: 900, fontSize: 11, border: '3px solid #ff8844', borderRadius: 4, cursor: 'pointer', letterSpacing: 2, boxShadow: '0 4px 20px rgba(255,69,0,0.4)', animation: 'pulse 1.2s infinite alternate' }}>ENTRAR NA FÁBRICA</div>
  </div>;
}
export function GameOverScreen({ score, onRetry }: { score: number; onRetry: () => void }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(40,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 28, color: '#e74c3c', fontWeight: 900, textShadow: '3px 3px 0 #000, 0 0 20px rgba(231,76,60,0.5)', animation: 'shake 0.5s infinite' }}>GAME OVER</div>
    <div style={{ color: '#f1c40f', fontSize: 12, marginTop: 8, fontWeight: 700 }}>SCORE: {score}</div>
    <div onClick={onRetry} style={{ marginTop: 14, padding: '10px 28px', background: 'linear-gradient(180deg, #e74c3c, #c0392b)', color: '#fff', fontWeight: 900, fontSize: 11, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 4 }}>TENTAR DE NOVO</div>
  </div>;
}
export function VictoryScreen({ score, onRetry }: { score: number; onRetry: () => void }) {
  return <div style={{ position: 'absolute', inset: 0, zIndex: 99999, background: 'radial-gradient(ellipse at center, rgba(0,40,20,0.85) 0%, rgba(0,0,0,0.95) 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontSize: 28, color: '#f1c40f', fontWeight: 900, textShadow: '3px 3px 0 #000, 0 0 25px rgba(241,196,15,0.5)', animation: 'pulse 1s infinite alternate' }}>🏆 VITÓRIA TOTAL! 🏆</div>
    <div style={{ color: '#2ecc71', fontSize: 10, marginTop: 8 }}>FURIO E A NUTRICONTROL FORAM DERROTADOS!</div>
    <div style={{ color: '#95a5a6', fontSize: 9, marginTop: 4, fontStyle: 'italic' }}>São Burgão está livre dos suplementos falsos.</div>
    <div style={{ color: '#f1c40f', fontSize: 14, marginTop: 8, fontWeight: 900 }}>SCORE FINAL: {score}</div>
    <div onClick={onRetry} style={{ marginTop: 14, padding: '10px 28px', background: 'linear-gradient(180deg, #f1c40f, #e67e22)', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 4 }}>JOGAR DE NOVO</div>
  </div>;
}

// ─────────────────────────────────────────────────────
//  GAME LOOP HELPERS (compartilhados entre fases)
// ─────────────────────────────────────────────────────

export function updatePlayerMovement(p: Player, k: Record<string, boolean>, particles: Particle[]) {
  let ix = 0, iy = 0;
  if (k['arrowleft'] || k['a']) ix -= 1; if (k['arrowright'] || k['d']) ix += 1;
  if (k['arrowup'] || k['w']) iy -= 1; if (k['arrowdown'] || k['s']) iy += 1;
  if (ix !== 0 && iy !== 0) { ix *= 0.707; iy *= 0.707; }
  if (ix !== 0) { p.vx += ix * PLAYER_ACCEL; p.vx = clamp(p.vx, -PLAYER_MAX_SPEED, PLAYER_MAX_SPEED); p.dir = ix > 0 ? 'right' : 'left'; }
  else { p.vx *= PLAYER_DECEL; if (Math.abs(p.vx) < 0.1) p.vx = 0; }
  if (iy !== 0) { p.vy += iy * PLAYER_ACCEL * 0.65; p.vy = clamp(p.vy, -PLAYER_MAX_SPEED * 0.65, PLAYER_MAX_SPEED * 0.65); }
  else { p.vy *= PLAYER_DECEL; if (Math.abs(p.vy) < 0.1) p.vy = 0; }
  p.x += p.vx; p.y += p.vy;
  p.x = clamp(p.x, 30, WORLD_W - 30); p.y = clamp(p.y, FLOOR_MIN, FLOOR_MAX);
}

export function updatePlayerJump(p: Player, k: Record<string, boolean>, particles: Particle[]) {
  const gnd = p.z <= 0 && p.vz <= 0;
  if (gnd) { p.coyoteTimer = COYOTE_TIME; if (!p.wasGrounded && p.landSquash <= 0) { p.landSquash = LAND_SQUASH_FRAMES; spawnParticles(particles, 4, p.x, p.y + 5, '#8B7355', 'dust', 2, 15, 5); } }
  else { if (p.coyoteTimer > 0) p.coyoteTimer--; }
  p.wasGrounded = gnd;
  if ((k['z'] || k[' ']) && p.coyoteTimer > 0 && p.z === 0) { p.vz = JUMP_FORCE; p.coyoteTimer = 0; p.landSquash = 0; spawnParticles(particles, 3, p.x, p.y + 5, '#8B7355', 'dust', 1.5, 12, 4); }
  if (!(k['z'] || k[' ']) && p.vz > 0) p.vz *= JUMP_CUT;
  if (p.z > 0 || p.vz > 0) { p.z += p.vz; p.vz -= GRAVITY; if (p.z > MAX_JUMP_Z) { p.z = MAX_JUMP_Z; if (p.vz > 0) p.vz = 0; } if (p.z <= 0) { p.z = 0; p.vz = 0; } }
  if (p.landSquash > 0) p.landSquash--;
}

export function updatePlayerAttacks(p: Player, k: Record<string, boolean>, enemies: Enemy[], screenShakeRef: React.MutableRefObject<number>) {
  if (k['x'] && !p.attacking && !p.buffing && p.atkTimer <= 0) { p.attacking = true; p.atkTimer = PUNCH_DURATION; enemies.forEach(e => e.hitThisSwing = false); }
  if (p.atkTimer > 0) { p.atkTimer--; if (p.atkTimer <= 0) p.attacking = false; }
  if (k['c'] && !p.buffing && !p.attacking && p.buffTimer <= 0) { p.buffing = true; p.buffTimer = BUFA_DURATION; enemies.forEach(e => e.hitThisSwing = false); screenShakeRef.current = 8; }
  if (p.buffTimer > 0) { p.buffTimer--; if (p.buffTimer <= 0) p.buffing = false; }
  if (p.hurtTimer > 0) { p.hurtTimer--; if (p.hurtTimer <= 0) p.hurt = false; }
  if (p.invincible > 0) p.invincible--;
  if (p.comboTimer > 0) { p.comboTimer--; if (p.comboTimer <= 0) p.combo = 0; }
  if (screenShakeRef.current > 0) screenShakeRef.current--;
}

export function updateIdleEating(p: Player, k: Record<string, boolean>, particles: Particle[], texts: FloatingTextData[], f: number) {
  const hasMovement = !!(k['arrowleft'] || k['a'] || k['arrowright'] || k['d'] || k['arrowup'] || k['w'] || k['arrowdown'] || k['s']);
  const hasAction = !!(k['x'] || k['c'] || k['z'] || k[' ']);
  if (hasMovement || hasAction || p.attacking || p.buffing || p.hurt || p.z > 0) {
    p.idleTimer = 0; p.eating = false; p.eatTimer = 0;
  } else {
    if (p.eating) { p.eatTimer--; if (p.eatTimer <= 0) { p.eating = false; p.idleTimer = 0; } }
    else { p.idleTimer++; if (p.idleTimer >= IDLE_EAT_FRAMES) { p.eating = true; p.eatTimer = IDLE_EAT_DURATION; p.idleTimer = 0; texts.push({ id: uid(), text: 'nhom nhom~', x: p.x + 20, y: p.y - 70, color: '#f39c12', size: 10, t: f }); spawnParticles(particles, 3, p.x + 15, p.y - 40, '#d4a017', 'dust', 1.5, 20, 3); } }
  }
}

export function updateDavisAI(dav: Davisaum, p: Player, enemies: Enemy[], food: FoodItem[], f: number) {
  const ced = enemies.length > 0 ? Math.min(...enemies.map(e => dist(e.x, e.y, dav.x, dav.y))) : Infinity;
  if (dav.isScared) { if (ced > DAV_SCARED_EXIT) dav.isScared = false; } else { if (ced < DAV_SCARED_ENTER) dav.isScared = true; }
  if (dav.isScared) {
    const ne = enemies.reduce((c, e) => { const d2 = dist(e.x, e.y, dav.x, dav.y); return d2 < c.d ? { d: d2, e } : c; }, { d: Infinity, e: null as Enemy | null });
    if (ne.e && ne.d < DAV_SCARED_EXIT) { const fx = dav.x - ne.e.x, fy = dav.y - ne.e.y, fd = Math.sqrt(fx * fx + fy * fy); if (fd > DAV_SNAP_DIST) { dav.x += (fx / fd) * DAV_FLEE_SPEED; dav.y += (fy / fd) * DAV_FLEE_SPEED * 0.5; dav.dir = fx > 0 ? 'right' : 'left'; } dav.isWalking = true; } else dav.isWalking = false;
  } else {
    const tx = p.dir === 'right' ? p.x - 90 : p.x + 90, ty = p.y, dx2 = tx - dav.x, dy2 = ty - dav.y, dt2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (dt2 > DAV_DEAD_ZONE) { dav.x += dx2 * DAV_FOLLOW_LERP; dav.y += dy2 * DAV_FOLLOW_LERP; if (Math.abs(tx - dav.x) < DAV_SNAP_DIST) dav.x = tx; if (Math.abs(ty - dav.y) < DAV_SNAP_DIST) dav.y = ty; dav.dir = dav.x < p.x ? 'right' : 'left'; dav.isWalking = true; } else dav.isWalking = false;
  }
  dav.x = clamp(dav.x, 30, WORLD_W - 30); dav.y = clamp(dav.y, FLOOR_MIN, FLOOR_MAX);
  dav.throwTimer++; dav.isThrowing = dav.throwTimer > 210;
  if (dav.throwTimer > 240) { dav.throwTimer = 0; dav.isThrowing = false; const r = Math.random(); const it = r < 0.25 ? 'manual' : r < 0.5 ? 'compass' : r < 0.75 ? 'burger' : 'fries'; food.push({ id: uid(), x: dav.x + (dav.dir === 'right' ? 40 : -40), y: dav.y, type: it as FoodItem['type'], t: f, vy: -3, landed: false }); }
}

export function updateItems(food: FoodItem[], p: Player, texts: FloatingTextData[], particles: Particle[], f: number): boolean {
  for (let i = food.length - 1; i >= 0; i--) {
    const fo = food[i];
    if (!fo.landed) { fo.vy += 0.3; fo.y += fo.vy; if (fo.vy > 0) { fo.landed = true; fo.vy = 0; } }
    if (Math.abs(fo.x - p.x) < 32 && Math.abs(fo.y - p.y) < 28 && p.z < 15) {
      if (fo.type === 'manual' || fo.type === 'compass') { texts.push({ id: uid(), text: '💢 INÚTIL!', x: p.x, y: p.y - 55 - p.z, color: '#999', size: 14, t: f }); p.atkTimer = 0; p.buffTimer = 0; p.attacking = false; p.buffing = false; }
      else { const heal = fo.type === 'burger' ? 25 : 15; p.hp = Math.min(MAX_HP, p.hp + heal); texts.push({ id: uid(), text: `+${heal} ❤`, x: p.x, y: p.y - 55 - p.z, color: '#2ecc71', size: 16, t: f }); spawnParticles(particles, 5, fo.x, fo.y - 10, '#2ecc71', 'spark', 2, 15, 3); }
      food.splice(i, 1); continue;
    }
    if (f - fo.t > 600) food.splice(i, 1);
  }
  return true;
}

export function updateParticlesAndTexts(particles: Particle[], texts: FloatingTextData[], f: number) {
  for (let i = particles.length - 1; i >= 0; i--) { const pt = particles[i]; pt.x += pt.vx; pt.y += pt.vy; if (pt.type === 'dust' || pt.type === 'hit') pt.vy += 0.15; if (pt.type === 'spark') { pt.vx *= 0.92; pt.vy *= 0.92; } pt.life--; if (pt.life <= 0) particles.splice(i, 1); }
  for (let i = texts.length - 1; i >= 0; i--) { if (f - texts[i].t >= 55) texts.splice(i, 1); }
}

/** Processa hits do jogador nos inimigos — retorna true se inimigo morreu */
export function checkPlayerHits(e: Enemy, p: Player, particles: Particle[], texts: FloatingTextData[], f: number): boolean {
  const hx = Math.abs(e.x - p.x), hy = Math.abs(e.y - p.y);
  const fac = p.dir === 'right' ? e.x > p.x - 10 : e.x < p.x + 10;
  const pf2 = PUNCH_DURATION - p.atkTimer;
  if (p.attacking && pf2 >= PUNCH_ACTIVE[0] && pf2 <= PUNCH_ACTIVE[1] && hx < PUNCH_RANGE && hy < PUNCH_DEPTH && fac && !e.hitThisSwing) {
    e.hitThisSwing = true; e.hp -= PUNCH_DAMAGE; e.hurt = true; e.hurtTimer = 10; e.kbx = p.dir === 'right' ? 7 : -7; e.kby = (e.y - p.y) * 0.05;
    p.combo++; p.comboTimer = COMBO_TIMEOUT; p.hitstop = HITSTOP_FRAMES;
    spawnParticles(particles, 5, (p.x + e.x) / 2, e.y - 40, '#f1c40f', 'spark', 4, 12, 4);
    texts.push({ id: uid(), text: `-${PUNCH_DAMAGE}`, x: e.x, y: e.y - 50, color: '#f1c40f', size: 14, t: f });
  }
  if (p.buffing && p.buffTimer < (BUFA_DURATION - BUFA_ACTIVE_START) && hx < BUFA_RANGE && hy < BUFA_DEPTH && !e.hitThisSwing) {
    e.hitThisSwing = true; const dmg = isBossType(e.type) ? BUFA_DAMAGE_BOSS : BUFA_DAMAGE_NORMAL;
    e.hp -= dmg; e.hurt = true; e.hurtTimer = 18; e.kbx = (e.x - p.x) > 0 ? 14 : -14; e.kby = (e.y - p.y) * 0.08;
    p.combo++; p.comboTimer = COMBO_TIMEOUT; p.hitstop = HITSTOP_FRAMES + 2;
    spawnParticles(particles, 8, (p.x + e.x) / 2, e.y - 40, '#2ecc71', 'spark', 6, 16, 5);
    spawnParticles(particles, 3, (p.x + e.x) / 2, e.y - 40, '#2ecc71', 'ring', 2, 20, 8);
    texts.push({ id: uid(), text: `-${dmg}`, x: e.x, y: e.y - 50, color: '#2ecc71', size: 18, t: f });
  }
  return e.hp <= 0;
}

/** IA genérica para inimigos normais (não-boss) */
export function updateBasicEnemyAI(e: Enemy, p: Player, particles: Particle[], texts: FloatingTextData[], f: number): 'dead' | 'alive' {
  if (e.punchTimer > 0) e.punchTimer--;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy);
  e.dir = dx > 0 ? 'right' : 'left';
  const sm = (e.type === 'fast' || e.type === 'cientista') ? 1.5 : e.type === 'seguranca' ? 0.9 : 1;
  if (d > 50) { e.x += (dx / d) * ENEMY_SPEED * sm; e.y += (dy / d) * ENEMY_SPEED * 0.7 * sm; } e.walking = d > 50;
  e.y = clamp(e.y, FLOOR_MIN, FLOOR_MAX); if (e.atkCd > 0) e.atkCd--;
  if (d < 50 && p.invincible <= 0 && p.z < 10 && !p.buffing && e.atkCd <= 0) {
    const cd = (e.type === 'fast' || e.type === 'cientista') ? 30 : 50; e.atkCd = cd; e.punchTimer = 15;
    const dmg = e.type === 'seguranca' ? 12 : (e.type === 'fast' || e.type === 'cientista') ? 8 : 10;
    p.hp -= dmg; p.hurt = true; p.hurtTimer = 15; p.invincible = 30; p.combo = 0; p.comboTimer = 0;
    spawnParticles(particles, 4, p.x, p.y - 30 - p.z, '#ff4444', 'hit', 3, 12, 4);
    texts.push({ id: uid(), text: `-${dmg}`, x: p.x, y: p.y - 40 - p.z, color: '#ff4444', size: 16, t: f });
    if (p.hp <= 0) return 'dead';
  }
  return 'alive';
}

// ─────────────────────────────────────────────────────
//  CSS ANIMATIONS (compartilhado)
// ─────────────────────────────────────────────────────
export const GAME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
  html,body{margin:0;padding:0;overflow:hidden;background:#000;touch-action:none;position:fixed;width:100%;height:100%}
  @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}50%{opacity:0.8;transform:translateY(-20px) scale(1.1)}100%{opacity:0;transform:translateY(-45px) scale(0.8)}}
  @keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.1);opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  @keyframes smokeRise{0%{opacity:0.6;transform:scale(0.5) translateY(0)}100%{opacity:0;transform:scale(1.8) translateY(-40px)}}
  @keyframes sonicWave{0%{transform:scale(0.5);opacity:0.7}100%{transform:scale(2.5);opacity:0}}
  @keyframes itemFloat{0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)}}
  @keyframes crumbFall{0%{opacity:0.9;transform:translateY(0) translateX(0)}100%{opacity:0;transform:translateY(25px) translateX(5px)}}
`;
