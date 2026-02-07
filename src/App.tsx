import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'

const INCREMENTS = [
  { label: 'A', value: 1 },
  { label: 'B', value: 2 },
  { label: 'C', value: 3 },
  { label: 'D', value: 5 },
  { label: 'E', value: 10 },
  { label: 'F', value: 15 },
]

const TIME_SIGNATURES = [
  { label: '4/4', beats: 4 },
  { label: '3/4', beats: 3 },
  { label: '6/8', beats: 6 },
]

const SUBDIVISIONS = [
  { label: '1/4', perBeat: 1 },   // quarter notes (no subdivision)
  { label: '1/8', perBeat: 2 },   // 8th notes
  { label: 'Trip', perBeat: 3 },  // triplets
  { label: '1/16', perBeat: 4 },  // 16th notes
]

const MEASURES_PER_CYCLE = 4
const MAX_BPM = 300
const DEFAULT_BPM = 60
const BUMP_INTERVALS = [
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
]

// Generate a smooth ECG PQRST waveform cycle (normalized -1 to 1)
function generateECGCycle(numPoints: number): number[] {
  const wave: number[] = []
  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints
    let y = 0
    // P wave (small upward bump)
    if (t > 0.08 && t < 0.2) {
      const pt = (t - 0.08) / 0.12
      y = -0.12 * Math.sin(pt * Math.PI)
    }
    // QRS complex (sharp spike)
    else if (t > 0.28 && t < 0.32) {
      const qt = (t - 0.28) / 0.04
      y = 0.08 * Math.sin(qt * Math.PI)
    } else if (t > 0.32 && t < 0.38) {
      const rt = (t - 0.32) / 0.06
      y = -0.85 * Math.sin(rt * Math.PI)
    } else if (t > 0.38 && t < 0.44) {
      const st = (t - 0.38) / 0.06
      y = 0.35 * Math.sin(st * Math.PI)
    }
    // T wave (gentle bump)
    else if (t > 0.52 && t < 0.72) {
      const tt = (t - 0.52) / 0.2
      y = -0.18 * Math.sin(tt * Math.PI)
    }
    wave.push(y)
  }
  return wave
}

const ECG_CYCLE = generateECGCycle(200)

// Per-beat variation parameters
interface BeatVariation {
  ampScale: number    // 0.85–1.15 multiplier on overall amplitude
  rPeakScale: number  // 0.9–1.1 multiplier on R peak specifically
  tWaveScale: number  // 0.8–1.2 multiplier on T wave
  baselineOff: number // small vertical offset (-0.03 to 0.03)
  timeStretch: number // 0.97–1.03 slight timing variation
}

function randomBeatVariation(): BeatVariation {
  return {
    ampScale: 0.85 + Math.random() * 0.30,
    rPeakScale: 0.9 + Math.random() * 0.20,
    tWaveScale: 0.8 + Math.random() * 0.40,
    baselineOff: (Math.random() - 0.5) * 0.06,
    timeStretch: 0.97 + Math.random() * 0.06,
  }
}

// Sample the ECG cycle with per-beat variation applied
function sampleECGWithVariation(t: number, v: BeatVariation): number {
  const ts = Math.min(Math.max(t / v.timeStretch, 0), 0.9999)
  const idx = Math.floor(ts * ECG_CYCLE.length) % ECG_CYCLE.length
  let val = ECG_CYCLE[idx]

  // Apply variation based on which part of the waveform we're in
  if (ts > 0.30 && ts < 0.46) {
    // QRS complex region — scale R peak
    val *= v.ampScale * v.rPeakScale
  } else if (ts > 0.50 && ts < 0.74) {
    // T wave region
    val *= v.ampScale * v.tWaveScale
  } else {
    val *= v.ampScale
  }

  return val + v.baselineOff
}

function App() {
  const [startBpmInput, setStartBpmInput] = useState(String(DEFAULT_BPM))
  const startBpm = parseInt(startBpmInput, 10) || DEFAULT_BPM
  const [selectedIncrement, setSelectedIncrement] = useState(3) // default +5
  const [selectedTimeSig, setSelectedTimeSig] = useState(0) // default 4/4
  const [selectedSubdiv, setSelectedSubdiv] = useState(0)   // default quarter
  const [selectedInterval, setSelectedInterval] = useState(1) // default 10s
  const [countdown, setCountdown] = useState(0) // seconds until next BPM bump
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentBpm, setCurrentBpm] = useState(DEFAULT_BPM)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [_totalMeasures, setTotalMeasures] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0) // seconds since start

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextNoteTimeRef = useRef(0)
  const currentBeatRef = useRef(0)
  const measureInCycleRef = useRef(0)
  const totalMeasuresRef = useRef(0)
  const currentBpmRef = useRef(DEFAULT_BPM)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const incrementRef = useRef(INCREMENTS[3].value)
  const beatsPerMeasureRef = useRef(TIME_SIGNATURES[0].beats)
  const subdivRef = useRef(SUBDIVISIONS[0].perBeat)
  const currentSubRef = useRef(0) // subdivision position within a beat
  const bumpIntervalRef = useRef(BUMP_INTERVALS[1].value) // 10s default
  // Time-based BPM increment tracking
  const lastBpmBumpTimeRef = useRef(0) // AudioContext time of last BPM bump
  const totalPausedDurationRef = useRef(0) // accumulated paused time
  const pauseStartTimeRef = useRef(0) // when the current pause started
  const bpmBumpReadyRef = useRef(false) // true once 10s elapsed, waiting for cycle start
  const elapsedTimerRef = useRef<number | null>(null) // interval for elapsed display

  useEffect(() => { incrementRef.current = INCREMENTS[selectedIncrement].value }, [selectedIncrement])
  useEffect(() => { beatsPerMeasureRef.current = TIME_SIGNATURES[selectedTimeSig].beats }, [selectedTimeSig])
  useEffect(() => { subdivRef.current = SUBDIVISIONS[selectedSubdiv].perBeat }, [selectedSubdiv])
  useEffect(() => { bumpIntervalRef.current = BUMP_INTERVALS[selectedInterval].value }, [selectedInterval])

  // ECG canvas animation refs
  const wavePhaseRef = useRef(0)
  const animFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)
  // Fade-out on stop
  const fadeOutRef = useRef(0) // 1 = full, fades to 0
  const fadeOutFrameRef = useRef<number | null>(null)
  // Beat variation: store variations keyed by cycle index
  const beatVarsRef = useRef<Map<number, BeatVariation>>(new Map())
  const baselineWanderRef = useRef(0)
  const baselineWanderVelRef = useRef(0)

  const getVariation = useCallback((cycleIndex: number): BeatVariation => {
    const map = beatVarsRef.current
    if (!map.has(cycleIndex)) {
      map.set(cycleIndex, randomBeatVariation())
      // Prune old entries to prevent memory leak (keep last 20 cycles)
      if (map.size > 20) {
        const oldest = Math.min(...map.keys())
        map.delete(oldest)
      }
    }
    return map.get(cycleIndex)!
  }, [])

  const drawECG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width * dpr
    const h = rect.height * dpr

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.clearRect(0, 0, w, h)

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 58, 58, 0.04)'
    ctx.lineWidth = dpr
    const gridSpacingX = w / 12
    const gridSpacingY = h / 8
    ctx.beginPath()
    for (let i = 1; i < 12; i++) {
      const x = i * gridSpacingX
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let i = 1; i < 8; i++) {
      const y = i * gridSpacingY
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    // Finer sub-grid
    ctx.strokeStyle = 'rgba(255, 58, 58, 0.015)'
    ctx.lineWidth = dpr * 0.5
    const subSpacingX = gridSpacingX / 5
    const subSpacingY = gridSpacingY / 4
    ctx.beginPath()
    for (let i = 1; i < 60; i++) {
      const x = i * subSpacingX
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
    }
    for (let i = 1; i < 32; i++) {
      const y = i * subSpacingY
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
    }
    ctx.stroke()

    const isStopped = !isPlayingRef.current && !isPausedRef.current
    const fadeAlpha = fadeOutRef.current

    if (isStopped && fadeAlpha <= 0) {
      // Fully stopped and faded — draw flatline only
      const baseY = h * 0.55
      ctx.strokeStyle = 'rgba(255, 58, 58, 0.15)'
      ctx.lineWidth = dpr * 1.5
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      ctx.lineTo(w, baseY)
      ctx.stroke()
      return
    }

    // During fade-out, draw flatline underneath
    if (isStopped && fadeAlpha > 0) {
      const baseY = h * 0.55
      ctx.strokeStyle = `rgba(255, 58, 58, ${0.15 * (1 - fadeAlpha)})`
      ctx.lineWidth = dpr * 1.5
      ctx.beginPath()
      ctx.moveTo(0, baseY)
      ctx.lineTo(w, baseY)
      ctx.stroke()
      ctx.globalAlpha = fadeAlpha
    }

    const phase = wavePhaseRef.current
    const baseY = h * 0.55
    const amplitude = h * 0.38
    const totalPoints = Math.floor(w)

    // Baseline wander — slow drift
    baselineWanderVelRef.current += (Math.random() - 0.5) * 0.0003
    baselineWanderVelRef.current *= 0.995 // damping
    baselineWanderRef.current += baselineWanderVelRef.current
    baselineWanderRef.current = Math.max(-0.04, Math.min(0.04, baselineWanderRef.current))
    const wander = baselineWanderRef.current * h

    // Helper to get ECG value at a given absolute phase position
    const getVal = (absPhase: number): number => {
      const cycleIndex = Math.floor(absPhase / totalPoints)
      const withinCycle = ((absPhase % totalPoints) + totalPoints) % totalPoints
      const t = withinCycle / totalPoints
      const variation = getVariation(cycleIndex)
      return sampleECGWithVariation(t, variation)
    }

    // Phosphor trail
    const sweepX = (phase % totalPoints)

    // Draw the waveform trace with phosphor afterglow
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath()
      let started = false

      for (let px = 0; px < totalPoints; px++) {
        let age = sweepX - px
        if (age < 0) age += totalPoints

        const trailLength = totalPoints * 0.85
        if (age > trailLength) continue

        const fadeFactor = 1.0 - (age / trailLength)
        const alpha = fadeFactor * fadeFactor

        const absPhase = phase - age
        const val = getVal(absPhase)
        const y = baseY + val * amplitude + wander

        if (pass === 0) {
          if (!started) {
            ctx.moveTo(px, y)
            started = true
          }
          ctx.strokeStyle = `rgba(255, 58, 58, ${alpha * 0.3})`
          ctx.lineWidth = dpr * 6
          ctx.beginPath()
          ctx.moveTo(px, y)
          const nextPx = px + 1
          if (nextPx < totalPoints) {
            let nextAge = sweepX - nextPx
            if (nextAge < 0) nextAge += totalPoints
            if (nextAge <= trailLength) {
              const nextAbsPhase = phase - nextAge
              const nextVal = getVal(nextAbsPhase)
              const nextY = baseY + nextVal * amplitude + wander
              ctx.lineTo(nextPx, nextY)
            }
          }
          ctx.stroke()
        } else {
          ctx.strokeStyle = `rgba(255, 68, 58, ${alpha * 0.9})`
          ctx.lineWidth = dpr * 2
          ctx.beginPath()
          ctx.moveTo(px, y)
          const nextPx = px + 1
          if (nextPx < totalPoints) {
            let nextAge = sweepX - nextPx
            if (nextAge < 0) nextAge += totalPoints
            if (nextAge <= trailLength) {
              const nextAbsPhase = phase - nextAge
              const nextVal = getVal(nextAbsPhase)
              const nextY = baseY + nextVal * amplitude + wander
              ctx.lineTo(nextPx, nextY)
            }
          }
          ctx.stroke()
        }
      }
    }

    // Bright dot at the sweep cursor position
    const cursorVal = getVal(phase)
    const cursorY = baseY + cursorVal * amplitude + wander
    const cursorX = sweepX

    // Outer glow
    const gradient = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, dpr * 12)
    gradient.addColorStop(0, 'rgba(255, 80, 60, 0.6)')
    gradient.addColorStop(0.5, 'rgba(255, 58, 58, 0.15)')
    gradient.addColorStop(1, 'rgba(255, 58, 58, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cursorX, cursorY, dpr * 12, 0, Math.PI * 2)
    ctx.fill()

    // Core dot
    ctx.fillStyle = '#ff6655'
    ctx.shadowColor = '#ff3a3a'
    ctx.shadowBlur = dpr * 8
    ctx.beginPath()
    ctx.arc(cursorX, cursorY, dpr * 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Dark gap ahead of cursor (erasing ahead)
    const gapWidth = totalPoints * 0.08
    const gapGradient = ctx.createLinearGradient(cursorX, 0, cursorX + gapWidth, 0)
    gapGradient.addColorStop(0, 'rgba(17, 17, 20, 0)')
    gapGradient.addColorStop(0.3, 'rgba(17, 17, 20, 0.95)')
    gapGradient.addColorStop(1, 'rgba(17, 17, 20, 0)')
    ctx.fillStyle = gapGradient
    ctx.fillRect(cursorX, 0, gapWidth, h)

    // Reset globalAlpha if it was changed during fade-out
    ctx.globalAlpha = 1
  }, [getVariation])

  const animateWaveform = useCallback(() => {
    if (!isPlayingRef.current || isPausedRef.current) return

    const now = performance.now()
    const elapsed = now - lastFrameTimeRef.current
    lastFrameTimeRef.current = now

    // Advance phase: one full cycle per beat
    // pixels per ms = (canvasWidth * bpm) / 60000
    const canvas = canvasRef.current
    if (canvas) {
      const dpr = window.devicePixelRatio || 1
      const totalPoints = Math.floor(canvas.getBoundingClientRect().width * dpr)
      const pixelsPerMs = (totalPoints * currentBpmRef.current) / 60000
      wavePhaseRef.current += elapsed * pixelsPerMs
    }

    drawECG()
    animFrameRef.current = requestAnimationFrame(animateWaveform)
  }, [drawECG])

  const startWaveform = useCallback(() => {
    // Cancel any fade-out in progress
    if (fadeOutFrameRef.current) {
      cancelAnimationFrame(fadeOutFrameRef.current)
      fadeOutFrameRef.current = null
    }
    fadeOutRef.current = 0
    wavePhaseRef.current = 0
    lastFrameTimeRef.current = performance.now()
    beatVarsRef.current.clear()
    baselineWanderRef.current = 0
    baselineWanderVelRef.current = 0
    animateWaveform()
  }, [animateWaveform])

  const stopWaveform = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    // Fade out the waveform over ~400ms
    fadeOutRef.current = 1
    const fadeStep = () => {
      fadeOutRef.current -= 0.05
      if (fadeOutRef.current <= 0) {
        fadeOutRef.current = 0
        drawECG()
        if (fadeOutFrameRef.current) {
          cancelAnimationFrame(fadeOutFrameRef.current)
          fadeOutFrameRef.current = null
        }
        return
      }
      drawECG()
      fadeOutFrameRef.current = requestAnimationFrame(fadeStep)
    }
    fadeOutFrameRef.current = requestAnimationFrame(fadeStep)
  }, [drawECG])

  // Resize handler for canvas
  useEffect(() => {
    const handleResize = () => {
      drawECG()
    }
    window.addEventListener('resize', handleResize)
    // Initial draw
    drawECG()
    return () => window.removeEventListener('resize', handleResize)
  }, [drawECG])

  const playClick = useCallback((time: number, clickType: 'downbeat' | 'beat' | 'sub') => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    if (clickType === 'downbeat') {
      osc.frequency.value = 1000
      gain.gain.setValueAtTime(0.8, time)
    } else if (clickType === 'beat') {
      osc.frequency.value = 700
      gain.gain.setValueAtTime(0.8, time)
    } else {
      osc.frequency.value = 500
      gain.gain.setValueAtTime(0.4, time)
    }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08)
    osc.start(time)
    osc.stop(time + 0.08)
  }, [])

  const scheduleNote = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx || isPausedRef.current) return

    const lookahead = 0.1
    const scheduleInterval = 25

    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      const beat = currentBeatRef.current
      const sub = currentSubRef.current
      const isMainBeat = sub === 0
      const isDownbeat = beat === 0 && isMainBeat
      const isCycleStart = isDownbeat && measureInCycleRef.current === 0

      // Mark bump as ready once the interval of active playing time has elapsed
      const activeTime = ctx.currentTime - lastBpmBumpTimeRef.current - totalPausedDurationRef.current
      if (activeTime >= bumpIntervalRef.current) {
        bpmBumpReadyRef.current = true
      }

      // Apply BPM bump only on the first beat of a new 4-bar cycle
      if (bpmBumpReadyRef.current && isCycleStart && totalMeasuresRef.current > 0) {
        const newBpm = Math.min(currentBpmRef.current + incrementRef.current, MAX_BPM)
        currentBpmRef.current = newBpm
        bpmBumpReadyRef.current = false
        lastBpmBumpTimeRef.current = ctx.currentTime
        totalPausedDurationRef.current = 0
      }

      // Determine click type
      const clickType: 'downbeat' | 'beat' | 'sub' = isDownbeat
        ? 'downbeat'
        : isMainBeat
          ? 'beat'
          : 'sub'
      playClick(nextNoteTimeRef.current, clickType)

      const delay = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000)

      // Only update UI beat indicators on main beats (not subdivisions)
      if (isMainBeat) {
        const uiBpm = currentBpmRef.current
        const uiTotal = totalMeasuresRef.current
        const uiBeat = beat

        setTimeout(() => {
          if (!isPlayingRef.current) return
          setCurrentBeat(uiBeat)
          setCurrentBpm(uiBpm)
          setTotalMeasures(uiTotal)
        }, delay)
      }

      // Advance subdivision
      currentSubRef.current += 1
      if (currentSubRef.current >= subdivRef.current) {
        currentSubRef.current = 0
        // Advance beat
        const nextBeat = beat + 1
        if (nextBeat >= beatsPerMeasureRef.current) {
          currentBeatRef.current = 0
          measureInCycleRef.current += 1
          totalMeasuresRef.current += 1
          if (measureInCycleRef.current >= MEASURES_PER_CYCLE) {
            measureInCycleRef.current = 0
          }
        } else {
          currentBeatRef.current = nextBeat
        }
      }

      const secondsPerBeat = 60.0 / currentBpmRef.current
      const secondsPerTick = secondsPerBeat / subdivRef.current
      nextNoteTimeRef.current += secondsPerTick
    }

    timerRef.current = window.setTimeout(scheduleNote, scheduleInterval)
  }, [playClick])

  const start = useCallback(() => {
    if (isPlaying && !isPaused) return

    if (isPaused && audioCtxRef.current) {
      audioCtxRef.current.resume()
      isPausedRef.current = false
      setIsPaused(false)
      // Account for paused duration
      totalPausedDurationRef.current += audioCtxRef.current.currentTime - pauseStartTimeRef.current
      nextNoteTimeRef.current = audioCtxRef.current.currentTime
      lastFrameTimeRef.current = performance.now()
      // Restart elapsed timer + countdown
      elapsedTimerRef.current = window.setInterval(() => {
        if (!isPlayingRef.current || isPausedRef.current) return
        const ctx = audioCtxRef.current
        if (!ctx) return
        const active = ctx.currentTime - totalPausedDurationRef.current
        setElapsedTime(Math.floor(active))
        // Countdown to next BPM bump
        const timeSinceLastBump = ctx.currentTime - lastBpmBumpTimeRef.current - totalPausedDurationRef.current
        const remaining = bpmBumpReadyRef.current
          ? 0
          : Math.max(0, Math.ceil(bumpIntervalRef.current - timeSinceLastBump))
        setCountdown(remaining)
      }, 250)
      scheduleNote()
      animateWaveform()
      return
    }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    // Mobile browsers (especially iOS) may start AudioContext in suspended state.
    // Must resume inside user gesture handler to unlock audio.
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // iOS silent-mode workaround: play a tiny silent buffer to unlock the audio output.
    // Without this, oscillator audio won't play through speakers when the phone
    // mute switch is on (headphones bypass this).
    try {
      const silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate)
      const source = ctx.createBufferSource()
      source.buffer = silentBuffer
      source.connect(ctx.destination)
      source.start(0)
    } catch (_e) {
      // Ignore — non-critical
    }

    const bpm = Math.min(Math.max(startBpm, 1), MAX_BPM)
    currentBeatRef.current = 0
    currentSubRef.current = 0
    measureInCycleRef.current = 0
    totalMeasuresRef.current = 0
    currentBpmRef.current = bpm
    nextNoteTimeRef.current = ctx.currentTime
    lastBpmBumpTimeRef.current = ctx.currentTime
    totalPausedDurationRef.current = 0
    pauseStartTimeRef.current = 0
    bpmBumpReadyRef.current = false

    setCurrentBeat(-1)
    setTotalMeasures(0)
    setElapsedTime(0)
    setCountdown(bumpIntervalRef.current)
    setCurrentBpm(bpm)

    isPlayingRef.current = true
    isPausedRef.current = false
    setIsPlaying(true)
    setIsPaused(false)

    // Start elapsed time display timer + countdown
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    elapsedTimerRef.current = window.setInterval(() => {
      if (!isPlayingRef.current || isPausedRef.current) return
      const actx = audioCtxRef.current
      if (!actx) return
      const active = actx.currentTime - totalPausedDurationRef.current
      setElapsedTime(Math.floor(active))
      // Countdown to next BPM bump
      const timeSinceLastBump = actx.currentTime - lastBpmBumpTimeRef.current - totalPausedDurationRef.current
      const remaining = bpmBumpReadyRef.current
        ? 0
        : Math.max(0, Math.ceil(bumpIntervalRef.current - timeSinceLastBump))
      setCountdown(remaining)
    }, 250)

    scheduleNote()
    startWaveform()
  }, [isPlaying, isPaused, startBpm, scheduleNote, startWaveform, animateWaveform])

  const pause = useCallback(() => {
    if (!isPlaying || isPaused) return
    isPausedRef.current = true
    setIsPaused(true)
    if (audioCtxRef.current) {
      pauseStartTimeRef.current = audioCtxRef.current.currentTime
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    stopWaveform()
    if (audioCtxRef.current) {
      audioCtxRef.current.suspend()
    }
  }, [isPlaying, isPaused, stopWaveform])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    isPausedRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    stopWaveform()
    setCurrentBeat(-1)
    setTotalMeasures(0)
    setElapsedTime(0)
    setCountdown(0)
    const bpmVal = parseInt(startBpmInput, 10) || DEFAULT_BPM
    setCurrentBpm(bpmVal)
  }, [startBpmInput, stopWaveform])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (fadeOutFrameRef.current) cancelAnimationFrame(fadeOutFrameRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  const currentIncrement = INCREMENTS[selectedIncrement].value

  const getModeText = () => {
    if (!isPlaying) return 'Ready'
    if (isPaused) return 'Paused'
    return 'Training'
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="device">
      {/* ECG Monitor */}
      <div className={`speaker ${isPlaying ? 'active' : ''} ${isPaused ? 'paused' : ''}`}>
        <canvas ref={canvasRef} className="ecg-canvas" />
      </div>

      {/* Display Screen */}
      <div className={`screen ${isPlaying ? 'playing' : ''} ${isPaused ? 'paused' : ''}`}>
        <div className="screen-header">
          <span className="mode-label">Mode: {getModeText()}</span>
          <div className="status-dots">
            <div className={`status-dot ${isPlaying && !isPaused ? 'on' : ''}`} />
            <div className={`status-dot ${isPaused ? 'on' : ''}`} />
            <div className="status-dot on" />
          </div>
        </div>

        <div className="bpm-display">
          <div className={`bpm-value ${currentBeat === 0 && isPlaying && !isPaused ? 'beat-flash' : ''}`}>
            {currentBpm}
          </div>
          <div className="bpm-label">BPM</div>
        </div>

        {/* Beat indicators */}
        <div className="beat-indicators">
          {Array.from({ length: TIME_SIGNATURES[selectedTimeSig].beats }, (_, i) => (
            <div
              key={i}
              className={`beat-dot ${i === 0 ? 'downbeat' : ''} ${currentBeat === i ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="screen-footer">
          <span>{isPlaying ? formatTime(elapsedTime) : `Bar 1`}</span>
          <span>{isPlaying ? `Next +${currentIncrement} in ${countdown}s` : `Start: ${startBpm}`}</span>
        </div>
      </div>

      {/* Settings */}
      <div className="settings-row settings-row-3">
        <div className="setting-group">
          <div className="setting-label">Start BPM</div>
          <div className="bpm-input-wrap">
            <input
              type="number"
              className="bpm-input"
              min={1}
              max={MAX_BPM}
              value={startBpmInput}
              onChange={(e) => {
                const raw = e.target.value
                setStartBpmInput(raw)
                const val = parseInt(raw, 10)
                if (!isNaN(val) && val >= 1 && val <= MAX_BPM && !isPlaying) {
                  setCurrentBpm(val)
                }
              }}
              onBlur={() => {
                const val = parseInt(startBpmInput, 10)
                if (isNaN(val) || val < 1) {
                  setStartBpmInput(String(DEFAULT_BPM))
                  if (!isPlaying) setCurrentBpm(DEFAULT_BPM)
                } else if (val > MAX_BPM) {
                  setStartBpmInput(String(MAX_BPM))
                  if (!isPlaying) setCurrentBpm(MAX_BPM)
                }
              }}
              disabled={isPlaying}
            />
            <span className="bpm-input-max">max {MAX_BPM}</span>
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">Increment</div>
          <div className="setting-grid">
            {INCREMENTS.map((inc, i) => (
              <button
                key={i}
                className={`setting-btn ${selectedIncrement === i ? 'selected' : ''}`}
                onClick={() => {
                  if (!isPlaying) {
                    setSelectedIncrement(i)
                  }
                }}
                disabled={isPlaying}
              >
                <span className="setting-btn-value">+{inc.value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">Interval</div>
          <div className="setting-grid">
            {BUMP_INTERVALS.map((bi, i) => (
              <button
                key={i}
                className={`setting-btn ${selectedInterval === i ? 'selected' : ''}`}
                onClick={() => { if (!isPlaying) setSelectedInterval(i) }}
                disabled={isPlaying}
              >
                <span className="setting-btn-value">{bi.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Signature & Subdivision */}
      <div className="settings-row">
        <div className="setting-group">
          <div className="setting-label">Time Sig</div>
          <div className="setting-grid">
            {TIME_SIGNATURES.map((ts, i) => (
              <button
                key={i}
                className={`setting-btn ${selectedTimeSig === i ? 'selected' : ''}`}
                onClick={() => { if (!isPlaying) setSelectedTimeSig(i) }}
                disabled={isPlaying}
              >
                <span className="setting-btn-value">{ts.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">Subdivision</div>
          <div className="setting-grid setting-grid-4">
            {SUBDIVISIONS.map((sd, i) => (
              <button
                key={i}
                className={`setting-btn ${selectedSubdiv === i ? 'selected' : ''}`}
                onClick={() => { if (!isPlaying) setSelectedSubdiv(i) }}
                disabled={isPlaying}
              >
                <span className="setting-btn-value">{sd.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="transport">
        <button className="transport-btn" onClick={start} disabled={isPlaying && !isPaused}>
          <div className="play-icon" />
          <span>Play</span>
        </button>
        <button className="transport-btn" onClick={pause} disabled={!isPlaying || isPaused}>
          <div className="pause-icon">
            <div /><div />
          </div>
          <span>Pause</span>
        </button>
        <button className="transport-btn" onClick={stop} disabled={!isPlaying}>
          <div className="stop-icon" />
          <span>Stop</span>
        </button>
      </div>

      <div className="brand-divider" />

      <div className="bottom-labels">
        <span className="bottom-label">Progressive Metronome</span>
        <span className="bottom-label">+{currentIncrement} BPM / {BUMP_INTERVALS[selectedInterval].value}s</span>
      </div>

      <div className="brand-mark">
        <span className="brand-name">CodyBPM</span>
      </div>

      <div className="made-in">made in fukuoka</div>
      <div className="credit">a cody, yohei and marsel collab</div>
    </div>
  )
}

export default App
