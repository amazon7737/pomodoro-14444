import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisualClockComponent } from './components/visual-clock.component';
import { FormsModule } from '@angular/forms';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  label: string;
  duration: number; // seconds
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, VisualClockComponent],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent {
  // Constants
  readonly MODES: Record<TimerMode, TimerSettings> = {
    pomodoro: { label: 'FOCUS', duration: 25 * 60 },
    shortBreak: { label: 'BREAK', duration: 5 * 60 },
    longBreak: { label: 'LONG', duration: 15 * 60 }
  };

  // State Signals
  currentMode = signal<TimerMode>('pomodoro');
  timeLeft = signal<number>(25 * 60);
  isRunning = signal<boolean>(false);
  themeColor = signal<string>('#f97316'); // Default Orange
  
  // Audio
  private tickSound = new Audio('https://cdn.freesound.org/previews/254/254316_4062622-lq.mp3'); 
  // Switched to a reliable CDN for a "Beep Beep Beep" digital alarm sound.
  // The previous GitHub raw link was unstable/missing.
  private alarmSound = new Audio('https://cdn.freesound.org/previews/219/219244_4082826-lq.mp3'); 

  // Derived State
  currentSettings = computed(() => this.MODES[this.currentMode()]);

  private intervalId: number | null = null;

  constructor() {
    this.tickSound.volume = 0.2;
    this.alarmSound.volume = 0.5;
  }

  toggleTimer() {
    if (this.isRunning()) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.timeLeft() <= 0) return;
    
    this.isRunning.set(true);
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  pause() {
    this.isRunning.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.pause();
    this.timeLeft.set(this.currentSettings().duration);
  }

  setMode(mode: TimerMode) {
    this.currentMode.set(mode);
    this.pause();
    this.timeLeft.set(this.MODES[mode].duration);
  }

  // Called when user drags the clock hand
  updateTime(newSeconds: number) {
    // If running, user dragging essentially reschedules the remaining time
    // We update the time immediately.
    this.timeLeft.set(newSeconds);
  }
  
  updateColor(event: Event) {
    const input = event.target as HTMLInputElement;
    this.themeColor.set(input.value);
  }

  private tick() {
    const current = this.timeLeft();
    if (current > 0) {
      this.timeLeft.set(current - 1);
    } else {
      this.complete();
    }
  }

  private complete() {
    this.pause();
    this.alarmSound.currentTime = 0;
    this.alarmSound.play().catch(e => console.error('Audio play failed', e));
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("Time's up!", { body: `${this.currentSettings().label} session complete.` });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
}