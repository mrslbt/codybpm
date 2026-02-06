import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'

const INCREMENTS = [
  { label: 'A', value: 5 },
  { label: 'B', value: 10 },
  { label: 'C', value: 15 },
]

const BEATS_PER_MEASURE = 4
const MEASURES_PER_BUMP = 4
const MAX_BPM = 300
const DEFAULT_BPM = 60

// Desktop: 24x16 pixel art icons — high-res, symmetrical fill
const COLS = 24
const ROWS = 16
const TOTAL_DOTS = COLS * ROWS

// Mobile: 16x10 pixel art icons — compact, no clipping
const COLS_MOBILE = 16
const ROWS_MOBILE = 10
const TOTAL_DOTS_MOBILE = COLS_MOBILE * ROWS_MOBILE

// prettier-ignore
const PIXEL_ICONS: number[][] = [
  // 1. Smiley 😊 — 24x16 grid, centered, wide U-smile
  //    face cols 7-16, eyes row 6, smile rows 8-11
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 2. Heart ❤️ — 24x16 grid, centered
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 3. Lightning ⚡ — 24x16 grid, centered
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 4. Star ⭐ — 24x16 grid, 5-pointed, centered
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,
    0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 5. Sparkle ✨ — 24x16 grid, 4-point burst, centered
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 6. Skull 💀 — 24x16 grid, centered
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
]

// prettier-ignore
const PIXEL_ICONS_MOBILE: number[][] = [
  // 1. Smiley 😊 — 16x10
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,1,0,1,1,1,1,1,1,0,1,0,0,0,
    0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 2. Heart ❤️ — 16x10
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,
    0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 3. Lightning ⚡ — 16x10
  [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,
    0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 4. Star ⭐ — 16x10
  [
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,
    0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
    0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 5. Sparkle ✨ — 16x10
  [
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,1,0,1,1,1,1,0,1,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,0,1,1,1,1,0,1,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
  // 6. Skull 💀 — 16x10
  [
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,
    0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,
    0,0,0,0,1,1,1,0,0,1,1,1,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,1,0,1,1,0,1,0,0,0,0,0,
    0,0,0,0,0,1,0,1,1,0,1,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  ],
]

function App() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 440px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 440px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const icons = isMobile ? PIXEL_ICONS_MOBILE : PIXEL_ICONS
  const totalDots = isMobile ? TOTAL_DOTS_MOBILE : TOTAL_DOTS

  const [startBpmInput, setStartBpmInput] = useState(String(DEFAULT_BPM))
  const startBpm = parseInt(startBpmInput, 10) || DEFAULT_BPM
  const [selectedIncrement, setSelectedIncrement] = useState(1) // default B (+10)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentBpm, setCurrentBpm] = useState(DEFAULT_BPM)
  const [currentBeat, setCurrentBeat] = useState(-1)
  const [measureInCycle, setMeasureInCycle] = useState(0)
  const [_totalMeasures, setTotalMeasures] = useState(0)
  const [speakerPattern, setSpeakerPattern] = useState<number[]>(icons[0])
  const [speakerFlash, setSpeakerFlash] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextNoteTimeRef = useRef(0)
  const currentBeatRef = useRef(0)
  const measureInCycleRef = useRef(0)
  const totalMeasuresRef = useRef(0)
  const currentBpmRef = useRef(DEFAULT_BPM)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const incrementRef = useRef(INCREMENTS[1].value)

  useEffect(() => { incrementRef.current = INCREMENTS[selectedIncrement].value }, [selectedIncrement])
  useEffect(() => { if (!isPlayingRef.current) setSpeakerPattern(icons[0]) }, [icons])

  const playClick = useCallback((time: number, isDownbeat: boolean) => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = isDownbeat ? 1000 : 700
    gain.gain.setValueAtTime(0.6, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06)
    osc.start(time)
    osc.stop(time + 0.06)
  }, [])

  const lastIconRef = useRef(0)

  const activateSpeakerDots = useCallback((isDownbeat: boolean) => {
    if (isDownbeat) {
      let next = Math.floor(Math.random() * icons.length)
      while (next === lastIconRef.current && icons.length > 1) {
        next = Math.floor(Math.random() * icons.length)
      }
      lastIconRef.current = next
      setSpeakerPattern(icons[next])
    }
    setSpeakerFlash(true)
    setTimeout(() => setSpeakerFlash(false), 100)
  }, [icons])

  const scheduleNote = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx || isPausedRef.current) return

    const lookahead = 0.1
    const scheduleInterval = 25

    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      const beat = currentBeatRef.current
      const isDownbeat = beat === 0

      playClick(nextNoteTimeRef.current, isDownbeat)

      const delay = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000)
      setTimeout(() => {
        if (!isPlayingRef.current) return
        setCurrentBeat(beat)
        activateSpeakerDots(isDownbeat)
      }, delay)

      const nextBeat = beat + 1
      if (nextBeat >= BEATS_PER_MEASURE) {
        currentBeatRef.current = 0
        measureInCycleRef.current += 1
        totalMeasuresRef.current += 1

        if (measureInCycleRef.current >= MEASURES_PER_BUMP) {
          measureInCycleRef.current = 0
          const newBpm = Math.min(currentBpmRef.current + incrementRef.current, MAX_BPM)
          currentBpmRef.current = newBpm
          setTimeout(() => {
            if (!isPlayingRef.current) return
            setCurrentBpm(newBpm)
            setMeasureInCycle(0)
            setTotalMeasures(totalMeasuresRef.current)
          }, delay)
        } else {
          setTimeout(() => {
            if (!isPlayingRef.current) return
            setMeasureInCycle(measureInCycleRef.current)
            setTotalMeasures(totalMeasuresRef.current)
          }, delay)
        }
      } else {
        currentBeatRef.current = nextBeat
      }

      const secondsPerBeat = 60.0 / currentBpmRef.current
      nextNoteTimeRef.current += secondsPerBeat
    }

    timerRef.current = window.setTimeout(scheduleNote, scheduleInterval)
  }, [playClick, activateSpeakerDots])

  const start = useCallback(() => {
    if (isPlaying && !isPaused) return

    if (isPaused && audioCtxRef.current) {
      audioCtxRef.current.resume()
      isPausedRef.current = false
      setIsPaused(false)
      nextNoteTimeRef.current = audioCtxRef.current.currentTime
      scheduleNote()
      return
    }

    const ctx = new AudioContext()
    audioCtxRef.current = ctx

    const bpm = Math.min(Math.max(startBpm, 1), MAX_BPM)
    currentBeatRef.current = 0
    measureInCycleRef.current = 0
    totalMeasuresRef.current = 0
    currentBpmRef.current = bpm
    nextNoteTimeRef.current = ctx.currentTime

    setCurrentBeat(-1)
    setMeasureInCycle(0)
    setTotalMeasures(0)
    setCurrentBpm(bpm)

    isPlayingRef.current = true
    isPausedRef.current = false
    setIsPlaying(true)
    setIsPaused(false)
    scheduleNote()
  }, [isPlaying, isPaused, startBpm, scheduleNote])

  const pause = useCallback(() => {
    if (!isPlaying || isPaused) return
    isPausedRef.current = true
    setIsPaused(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.suspend()
    }
  }, [isPlaying, isPaused])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    isPausedRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setCurrentBeat(-1)
    setMeasureInCycle(0)
    setTotalMeasures(0)
    const bpmVal = parseInt(startBpmInput, 10) || DEFAULT_BPM
    setCurrentBpm(bpmVal)
    setSpeakerPattern(icons[0])
    setSpeakerFlash(false)
  }, [startBpmInput, icons])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  const currentIncrement = INCREMENTS[selectedIncrement].value

  const getModeText = () => {
    if (!isPlaying) return 'Ready'
    if (isPaused) return 'Paused'
    return 'Training'
  }

  return (
    <div className="device">
      {/* Speaker Grille */}
      <div className={`speaker ${isPlaying && !isPaused ? 'active' : ''}`}>
        <div className={`speaker-dots ${isMobile ? 'mobile' : ''}`}>
          {Array.from({ length: totalDots }, (_, i) => (
            <div
              key={i}
              className={`speaker-dot ${speakerPattern[i] ? 'lit' : ''} ${speakerPattern[i] && speakerFlash ? 'flash' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Display Screen */}
      <div className={`screen ${isPlaying && !isPaused ? 'playing' : ''}`}>
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
          {Array.from({ length: BEATS_PER_MEASURE }, (_, i) => (
            <div
              key={i}
              className={`beat-dot ${i === 0 ? 'downbeat' : ''} ${currentBeat === i ? 'active' : ''}`}
            />
          ))}
        </div>

        <div className="screen-footer">
          <span>Measure {measureInCycle + 1}/{MEASURES_PER_BUMP}</span>
          <span>{isPlaying ? `+${currentIncrement} / ${MEASURES_PER_BUMP} bars` : `Start: ${startBpm}`}</span>
        </div>
      </div>

      {/* Settings Row */}
      <div className="settings-row">
        {/* Start BPM */}
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

        {/* Increment */}
        <div className="setting-group">
          <div className="setting-label">Increment</div>
          <div className="setting-buttons">
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

      <div className="bottom-labels">
        <span className="bottom-label">CodyBPM</span>
        <span className="bottom-label">+{currentIncrement} BPM / {MEASURES_PER_BUMP} bars</span>
      </div>

      <div className="made-in">made in fukuoka</div>
      <div className="credit">@bymarselb</div>
    </div>
  )
}

export default App
