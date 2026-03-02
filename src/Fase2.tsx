// ═══════════════════════════════════════════════════════
//  Fase2.tsx — Fábrica NutriControl / Boss: Furio
// ═══════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { CENARIO_FASE2 } from './cenarioFase2';
import type { Player, Enemy, FoodItem, Particle, FloatingTextData, Davisaum, EnemyType } from './gameCore';
import {
  BASE_W, BASE_H, WORLD_W, FLOOR_MIN, FLOOR_MAX, MAX_HP, MAX_ENEMIES,
  ENEMY_SPEED, FOOD_SIZE, KNOCKBACK_DECAY,
  SPRITE_PLAYER_W, SPRITE_PLAYER_OFFSET_Y, SPRITE_DAVIS_OFFSET_Y, SPRITE_ENEMY_OFFSET_Y,
  DEFAULT_PLAYER, DEFAULT_DAVIS,
  rng, clamp, uid, resetUid, dist, spawnParticles, isBossType,
  updatePlayerMovement, updatePlayerJump, updatePlayerAttacks, updateIdleEating,
  updateDavisAI, updateItems, updateParticlesAndTexts, checkPlayerHits, updateBasicEnemyAI,
  PixelWallacaum, PixelDavisaum, PixelAgent, FoodItemComp, FloatingText, ParticleRenderer,
  TouchDpad, TouchActions, HpBar, ScoreDisplay, BossHpBar, MusicButton,
  GAME_CSS
} from './gameCore';
const PHASE2_BOSS_THRESHOLD = 800;
const FURIO_HP = 60;
const FURIO_CHARGE_SPEED = 5;
const FURIO_PUNCH_DMG = 20;
const FURIO_CHARGE_DMG = 30;
const SPAWN_INTERVAL_FASE2 = 3000;

export interface Fase2Props {
  initialScore: number;
  initialHp: number;
  muted: boolean;
  onToggleMute: () => void;
  onVictory: (score: number) => void;
  onGameOver: (score: number) => void;
  onRestart: () => void;
}

export default function Fase2({ initialScore, initialHp, muted, onToggleMute, onVictory, onGameOver, onRestart }: Fase2Props) {
  const playerRef = useRef<Player>({ ...DEFAULT_PLAYER, hp: Math.min(MAX_HP, initialHp + 30), invincible: 60 });
  const enemiesRef = useRef<Enemy[]>([]);
  const foodRef = useRef<FoodItem[]>([]);
  const textsRef = useRef<FloatingTextData[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const davisRef = useRef<Davisaum>({ ...DEFAULT_DAVIS });
  const keysRef = useRef<Record<string, boolean>>({});
  const frameRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const cameraRef = useRef(0);
  const bossSpawned = useRef(false);
  const screenShakeRef = useRef(0);
  const scoreRef = useRef(initialScore);
  const [score, setScore] = useState(initialScore);
  const [dead, setDead] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const d = (e: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); keysRef.current[e.key.toLowerCase()] = true; };
    const u = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', d, { passive: false }); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  useEffect(() => {
    if (dead) return;
    let animId: number;
    const loop = () => {
      const p = playerRef.current; const k = keysRef.current; const f = ++frameRef.current;
      const dav = davisRef.current; const enemies = enemiesRef.current;
      const particles = particlesRef.current; const texts = textsRef.current;
      if (p.hitstop > 0) { p.hitstop--; tick(f); animId = requestAnimationFrame(loop); return; }

      updateIdleEating(p, k, particles, texts, f);
      updatePlayerMovement(p, k, particles);
      updatePlayerJump(p, k, particles);
      cameraRef.current += (clamp(p.x - BASE_W / 2, 0, WORLD_W - BASE_W) - cameraRef.current) * 0.07;
      updatePlayerAttacks(p, k, enemies, screenShakeRef);
      updateDavisAI(dav, p, enemies, foodRef.current, f);

      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hurtTimer > 0) {
          e.hurtTimer--; e.x += e.kbx; e.y += e.kby || 0;
          e.kbx *= KNOCKBACK_DECAY; e.kby = (e.kby || 0) * KNOCKBACK_DECAY;
          e.x = clamp(e.x, 10, WORLD_W - 10); e.y = clamp(e.y, FLOOR_MIN, FLOOR_MAX);
          if (e.hurtTimer <= 0) { e.hurt = false; e.charging = false; }
          continue;
        }

        // ── FURIO BOSS AI ──
        if (e.type === 'furio') {
          const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy);
          e.dir = dx > 0 ? 'right' : 'left';
          if (e.punchTimer > 0) e.punchTimer--;
          const furioSuper = e.hp / e.maxHp < 0.35;
          const chargeSpd = furioSuper ? FURIO_CHARGE_SPEED * 1.6 : FURIO_CHARGE_SPEED;
          const chargeDmg = furioSuper ? FURIO_CHARGE_DMG + 10 : FURIO_CHARGE_DMG;
          const punchDmg = furioSuper ? FURIO_PUNCH_DMG + 8 : FURIO_PUNCH_DMG;
          const cdMult = furioSuper ? 0.5 : 1;
          const particleColor = furioSuper ? '#4488ff' : '#ff4500';

          if (furioSuper && e.hp === Math.floor(e.maxHp * 0.35)) {
            texts.push({ id: uid(), text: '💀 FURIA MÁXIMA!', x: e.x, y: e.y - 90, color: '#4488ff', size: 20, t: f });
            screenShakeRef.current = 20;
            spawnParticles(particles, 12, e.x, e.y - 40, '#4488ff', 'ring', 12, 30, 15);
          }

          if (e.charging) {
            e.x += (e.chargeDir || 1) * chargeSpd; e.x = clamp(e.x, 10, WORLD_W - 10); e.stateTimer--;
            if (f % 3 === 0) spawnParticles(particles, 2, e.x, e.y - 20, particleColor, 'spark', 3, 10, 4);
            if (e.stateTimer <= 0) { e.charging = false; e.atkCd = Math.floor(90 * cdMult); }
            if (Math.abs(e.x - p.x) < 50 && Math.abs(e.y - p.y) < 40 && p.invincible <= 0 && p.z < 15) {
              p.hp -= chargeDmg; p.hurt = true; p.hurtTimer = 25; p.invincible = 50;
              p.vx = (e.chargeDir || 1) * (furioSuper ? 18 : 15); p.combo = 0; p.comboTimer = 0;
              screenShakeRef.current = furioSuper ? 20 : 15;
              spawnParticles(particles, 10, p.x, p.y - 30, particleColor, 'hit', 6, 20, 7);
              texts.push({ id: uid(), text: `-${chargeDmg}`, x: p.x, y: p.y - 50, color: '#ff2200', size: 24, t: f });
              if (p.hp <= 0) { setDead(true); onGameOver(scoreRef.current); return; }
              e.charging = false; e.atkCd = Math.floor(60 * cdMult);
            }
          }
          else if (d < 220 && e.atkCd <= 0 && d > 80) {
            e.charging = true; e.chargeDir = dx > 0 ? 1 : -1; e.stateTimer = furioSuper ? 30 : 40;
            texts.push({ id: uid(), text: furioSuper ? '⚡ SUPER CARGA!' : '💥 CARGA!', x: e.x, y: e.y - 70, color: particleColor, size: 16, t: f });
            screenShakeRef.current = furioSuper ? 10 : 6;
          }
          else if (d < 200 && e.atkCd <= 0 && !e.charging) {
            e.walking = false; e.stateTimer++;
            if (e.stateTimer === 1) texts.push({ id: uid(), text: furioSuper ? '💀 MORRA!' : '⚠ FURIO!', x: e.x, y: e.y - 70, color: particleColor, size: 14, t: f });
            if (e.stateTimer > (furioSuper ? 25 : 40)) {
              e.atkCd = Math.floor(120 * cdMult); e.stateTimer = 0;
              texts.push({ id: uid(), text: furioSuper ? 'ANIQUILAÇÃO!!!' : 'DESTRUIÇÃO!!!', x: e.x, y: e.y - 40, color: particleColor, size: 20, t: f });
              screenShakeRef.current = furioSuper ? 22 : 15;
              spawnParticles(particles, furioSuper ? 12 : 8, e.x, e.y - 30, `${particleColor}99`, 'ring', 10, 25, 12);
              const aoeRange = furioSuper ? 250 : 200;
              if (d < aoeRange && p.z < 20 && p.invincible <= 0) {
                p.hp -= punchDmg; p.hurt = true; p.hurtTimer = 20; p.invincible = 40;
                p.vx = (dx > 0 ? -1 : 1) * (furioSuper ? 18 : 14); p.combo = 0; p.comboTimer = 0;
                spawnParticles(particles, 8, p.x, p.y - 30 - p.z, particleColor, 'hit', 5, 18, 6);
                texts.push({ id: uid(), text: `-${punchDmg}`, x: p.x, y: p.y - 50 - p.z, color: '#ff2200', size: 22, t: f });
                if (p.hp <= 0) { setDead(true); onGameOver(scoreRef.current); return; }
              }
            }
          }
          else {
            e.stateTimer = 0; e.walking = true;
            if (d > 60) { e.x += (dx / d) * ENEMY_SPEED * 1.2; e.y += (dy / d) * ENEMY_SPEED * 0.6; }
            e.y = clamp(e.y, FLOOR_MIN, FLOOR_MAX); if (e.atkCd > 0) e.atkCd--;
            if (d < 55 && e.atkCd <= 0 && p.invincible <= 0 && p.z < 10) {
              e.atkCd = 45; e.punchTimer = 15; p.hp -= 12; p.hurt = true; p.hurtTimer = 15; p.invincible = 30;
              p.combo = 0; p.comboTimer = 0;
              spawnParticles(particles, 5, p.x, p.y - 30, '#ff4444', 'hit', 3, 14, 5);
              texts.push({ id: uid(), text: '-12', x: p.x, y: p.y - 40, color: '#ff4444', size: 16, t: f });
              if (p.hp <= 0) { setDead(true); onGameOver(scoreRef.current); return; }
            }
          }
        }
        // ── Inimigos normais ──
        else {
          const result = updateBasicEnemyAI(e, p, particles, texts, f);
          if (result === 'dead') { setDead(true); onGameOver(scoreRef.current); return; }
        }

        // ── Hit detection ──
        const died = checkPlayerHits(e, p, particles, texts, f);
        if (died) {
          enemies.splice(i, 1);
          const deathColor = e.type === 'furio' ? '#ff4500' : e.type === 'seguranca' ? '#27ae60' : '#2980b9';
          spawnParticles(particles, 12, e.x, e.y - 30, deathColor, 'spark', 6, 25, 5);
          if (e.type === 'furio') {
            screenShakeRef.current = 25;
            spawnParticles(particles, 20, e.x, e.y - 40, '#f1c40f', 'ring', 10, 35, 15);
            onVictory(scoreRef.current);
            return;
          } else {
            const bonus = p.combo >= 5 ? 150 : 100;
            scoreRef.current += bonus;
            setScore(scoreRef.current);
          }
        }
      }

      updateItems(foodRef.current, p, texts, particles, f);

      // ── SPAWN ──
      spawnTimerRef.current++;
      const si = SPAWN_INTERVAL_FASE2 / 16.67;
      const phaseScore = scoreRef.current - initialScore;
      if (phaseScore >= PHASE2_BOSS_THRESHOLD && !bossSpawned.current) {
        bossSpawned.current = true;
        const spawnY = clamp(p.y, FLOOR_MIN, FLOOR_MAX);
        enemies.push({ id: uid(), type: 'furio', x: p.x + 400, y: spawnY, z: 0, hp: FURIO_HP, maxHp: FURIO_HP, dir: 'left', walking: true, hurt: false, hurtTimer: 0, kbx: 0, kby: 0, atkCd: 90, stateTimer: 0, punchTimer: 0, hitThisSwing: false, charging: false, chargeDir: 0 });
        screenShakeRef.current = 20;
        texts.push({ id: uid(), text: '🔥 FURIO — CHEFE FINAL!', x: p.x + 200, y: p.y - 100, color: '#ff4500', size: 18, t: f });
      } else if (spawnTimerRef.current > si && enemies.length < MAX_ENEMIES && !bossSpawned.current) {
        spawnTimerRef.current = 0;
        const side = Math.random() < 0.5 ? p.x - BASE_W * 0.6 : p.x + BASE_W * 0.6;
        const tp: EnemyType = Math.random() > 0.5 ? 'seguranca' : 'cientista';
        const ehp = tp === 'seguranca' ? 5 : 3;
        enemies.push({ id: uid(), type: tp, x: clamp(side, 10, WORLD_W - 10), y: rng(FLOOR_MIN + 10, FLOOR_MAX - 10), z: 0, hp: ehp, maxHp: ehp, dir: side < p.x ? 'right' : 'left', walking: true, hurt: false, hurtTimer: 0, kbx: 0, kby: 0, atkCd: 30, stateTimer: 0, punchTimer: 0, hitThisSwing: false });
      }

      updateParticlesAndTexts(particles, texts, f);
      tick(f);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [dead]);

  const p = playerRef.current, f = frameRef.current, cam = cameraRef.current, dav = davisRef.current;
  const isMoving = Math.abs(p.vx) > 0.3 || Math.abs(p.vy) > 0.3;
  const entities: Array<{ key: string; type: string; y: number; data: any }> = [
    { key: 'player', type: 'player', y: p.y, data: p },
    { key: 'davisaum', type: 'davisaum', y: dav.y, data: dav },
    ...enemiesRef.current.map(e => ({ key: e.id, type: 'enemy', y: e.y, data: e })),
    ...foodRef.current.map(fo => ({ key: fo.id, type: 'food', y: fo.y, data: fo })),
  ].sort((a, b) => a.y - b.y);
  const shakeX = screenShakeRef.current > 0 ? rng(-screenShakeRef.current, screenShakeRef.current) : 0;
  const shakeY = screenShakeRef.current > 0 ? rng(-screenShakeRef.current * 0.6, screenShakeRef.current * 0.6) : 0;
  const bossEnemy = enemiesRef.current.find(e => isBossType(e.type));

  return (
    <>
      <div style={{ position: 'absolute', inset: -4, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${CENARIO_FASE2})`, backgroundRepeat: 'repeat-x', backgroundPositionX: -cam, backgroundSize: 'cover', backgroundPositionY: 'bottom' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,20,0.1) 0%, transparent 30%, transparent 80%, rgba(0,0,0,0.15) 100%)', pointerEvents: 'none' }} />
        {entities.map(ent => {
          const sx = ent.data.x - cam;
          if (sx < -120 || sx > BASE_W + 120) return null;
          if (ent.type === 'player') return <div key="player" style={{ position: 'absolute', left: sx - SPRITE_PLAYER_W / 2, top: ent.data.y - SPRITE_PLAYER_OFFSET_Y - (ent.data.z || 0), zIndex: Math.floor(ent.data.y) }}><PixelWallacaum direction={ent.data.dir} isWalking={isMoving} isAttacking={ent.data.attacking} isBuffa={ent.data.buffing} isHurt={ent.data.hurt} isEating={ent.data.eating} jumpZ={ent.data.z || 0} landSquash={ent.data.landSquash} combo={ent.data.combo} /></div>;
          if (ent.type === 'davisaum') return <div key="davisaum" style={{ position: 'absolute', left: sx - 45, top: ent.data.y - SPRITE_DAVIS_OFFSET_Y, zIndex: Math.floor(ent.data.y) }}><PixelDavisaum direction={ent.data.dir} isWalking={ent.data.isWalking} isThrowing={ent.data.isThrowing} isScared={ent.data.isScared} frame={f} /></div>;
          if (ent.type === 'enemy') return <div key={ent.key} style={{ position: 'absolute', left: sx - 45, top: ent.data.y - SPRITE_ENEMY_OFFSET_Y, zIndex: Math.floor(ent.data.y) }}><PixelAgent type={ent.data.type} direction={ent.data.dir} isWalking={ent.data.walking} punchTimer={ent.data.punchTimer} stateTimer={ent.data.stateTimer} frame={f} isHurt={ent.data.hurt} hp={ent.data.hp} maxHp={ent.data.maxHp} charging={ent.data.charging} /></div>;
          if (ent.type === 'food') return <div key={ent.key} style={{ position: 'absolute', left: sx - FOOD_SIZE / 2, top: ent.data.y - FOOD_SIZE - 8, zIndex: Math.floor(ent.data.y) - 1 }}><FoodItemComp type={ent.data.type} landed={ent.data.landed} /></div>;
          return null;
        })}
        <ParticleRenderer particles={particlesRef.current} cam={cam} />
        {textsRef.current.map(ft => <FloatingText key={ft.id} text={ft.text} x={ft.x - cam - 10} y={ft.y} color={ft.color} size={ft.size} />)}
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9990, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)', mixBlendMode: 'multiply' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9991, boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)' }} />
      <HpBar hp={p.hp} maxHp={MAX_HP} />
      <ScoreDisplay score={score} combo={p.combo} phase={2} />
      {bossEnemy && <BossHpBar enemy={bossEnemy} />}
      <MusicButton muted={muted} onToggle={onToggleMute} />
      <TouchDpad keysRef={keysRef} />
      <TouchActions keysRef={keysRef} />
    </>
  );
}
