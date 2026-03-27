# CodyBPM — Progressive Metronome

## What is CodyBPM?

CodyBPM is a browser-based metronome designed for musicians who practice with progressive tempo training. Instead of manually bumping the BPM every few bars, CodyBPM does it for you — automatically increasing the tempo at timed intervals so you can stay focused on your instrument.

Set your starting BPM, pick how much to increase and how often, hit play, and let CodyBPM push your speed limits while you practice.

## Why?

Every musician has hit the wall where a passage feels impossible at full speed. The standard advice is always the same: start slow, gradually speed up. But constantly reaching for a metronome dial breaks your flow. CodyBPM automates that process — you set the rules, it handles the tempo, and you just play.

## How It Works

1. **Set your starting BPM** (1-300)
2. **Choose an increment** — how many BPM to add each bump (+1, +2, +3, +5, +10, or +15)
3. **Choose an interval** — how often the bump happens (every 5s, 10s, 15s, 20s, 30s, or 60s)
4. **Pick your time signature** — 4/4, 3/4, or 6/8
5. **Pick subdivisions** — quarter notes, 8th notes, triplets, or 16th notes
6. **Press Play** — the tempo increases automatically, always landing on the downbeat of a new bar

A progress bar and countdown timer show you exactly when the next bump is coming. The current BPM, elapsed time, and bar count are all visible on the display.

## The Interface

CodyBPM is styled to look and feel like a piece of physical audio hardware — dark metallic shell, engraved labels, CRT-style scanlines, and a power-on boot animation. The top of the device features an ECG heart-monitor waveform that pulses in sync with the beat, complete with phosphor trails and a sweep cursor.

## Features

- **Progressive tempo training** — automatic BPM increases on the downbeat
- **Time signatures** — 4/4, 3/4, 6/8
- **Subdivisions** — quarter, 8th, triplet, 16th
- **ECG beat visualizer** — heart-monitor waveform synced to every click
- **Distinct click tones** — different frequencies for downbeats (1000 Hz), beats (700 Hz), and subdivisions (500 Hz)
- **Pause & resume** — pausing freezes the timer; resuming picks up exactly where you left off
- **Mobile-ready** — iOS silent mode workaround and AudioContext unlock built in
- **No dependencies beyond React** — all audio and visuals are built with native Web Audio API and Canvas

## Getting Started

```bash
git clone https://github.com/mrslbt/codybpm.git
cd codybpm
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- React 19 + TypeScript
- Vite
- Web Audio API (sample-accurate scheduling via `AudioContext` + `OscillatorNode`)
- Canvas API (ECG waveform rendering with phosphor/scanline effects)

## Built by

A Cody, Yohei, and Marsel collaboration — made in Fukuoka.
