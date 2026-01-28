import { Component, input, output, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-visual-clock',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full max-w-[340px] aspect-square mx-auto select-none p-4">
      
      <!-- Case (Rounded Square) -->
      <div class="absolute inset-0 bg-[#f3f4f6] rounded-[3rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.05),inset_0_2px_0_rgba(255,255,255,1)] border border-gray-200/50"></div>
      
      <!-- Top Right Toggle (Play/Pause) -->
      <button 
        (click)="handleToggle()"
        class="absolute top-6 right-6 w-12 h-12 rounded-full z-20 flex flex-col items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer group hover:scale-105 active:scale-95"
        [class]="isRunning() ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] ring-2' : 'bg-[#e5e7eb] shadow-inner ring-1 ring-gray-300'"
        [style.borderColor]="isRunning() ? color() : 'transparent'"
        [style.boxShadow]="isRunning() ? '0 2px 8px ' + color() + '40' : ''"
        title="Toggle Timer"
      >
         <div class="relative w-full h-full flex items-center justify-center">
            <!-- Indicator Dot -->
            <div class="w-2 h-2 rounded-full transition-colors duration-300 mb-1"
                 [style.backgroundColor]="isRunning() ? color() : '#9ca3af'"
                 [style.boxShadow]="isRunning() ? '0 0 6px ' + color() + '99' : ''"></div>
            <span class="absolute bottom-2 text-[8px] font-bold tracking-wider uppercase leading-none transition-colors duration-300"
                  [style.color]="isRunning() ? color() : '#6b7280'">
              {{ isRunning() ? 'ON' : 'OFF' }}
            </span>
         </div>
      </button>

      <!-- Inner Face (Circle) -->
      <div class="absolute inset-4 bg-white rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center overflow-hidden border-4 border-[#f9fafb]">
        
        <!-- Interactive Layer -->
        <!-- We use pointer-events-auto here to capture clicks on the face -->
        <svg 
          viewBox="0 0 300 300" 
          class="w-full h-full touch-none"
          [class.cursor-grab]="!isRunning()"
          [class.active:cursor-grabbing]="!isRunning()"
          [class.cursor-not-allowed]="isRunning()"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerUp($event)"
          (pointerleave)="onPointerUp($event)"
        >
          <!-- Clock Face Group -->
          <g transform="translate(150, 150)">
            
            <!-- Ticks -->
            @for (tick of ticks(); track tick.angle) {
              <line 
                [attr.x1]="tick.x1" 
                [attr.y1]="tick.y1" 
                [attr.x2]="tick.x2" 
                [attr.y2]="tick.y2" 
                [attr.stroke]="tick.isMajor ? '#111827' : '#9ca3af'"
                [attr.stroke-width]="tick.isMajor ? 3 : 1.5"
                stroke-linecap="round"
                pointer-events="none"
              />
              @if (tick.isMajor) {
                <text 
                  [attr.x]="tick.tx" 
                  [attr.y]="tick.ty" 
                  text-anchor="middle" 
                  dominant-baseline="middle" 
                  class="font-bold fill-gray-900 leading-none select-none pointer-events-none"
                  style="font-family: 'Inter', sans-serif; font-size: 16px;">
                  {{ tick.label }}
                </text>
              }
            }

            <!-- Center Text Info -->
            <text y="-40" text-anchor="middle" class="text-[10px] font-bold tracking-[0.25em] fill-gray-400 uppercase pointer-events-none select-none">
              {{ label() }}
            </text>
            <text y="60" text-anchor="middle" class="text-[14px] font-mono font-medium tracking-widest fill-gray-400 tabular-nums opacity-60 pointer-events-none select-none">
               {{ formattedTime() }}
            </text>

            <!-- Wedge (Time Remaining) -->
            <g transform="rotate(-90)">
               <path 
                 [attr.d]="wedgePath()" 
                 [attr.fill]="color()" 
                 fill-opacity="0.2"
                 [attr.stroke]="color()"
                 stroke-opacity="0.4" 
                 stroke-width="1"
                 pointer-events="none" 
               />
            </g>

            <!-- Hands Container -->
            <g transform="rotate(-90)">
              <!-- Minute Hand Group -->
              <g [style.transform]="handTransform()" class="transition-transform duration-75 ease-out" [class.duration-700]="!isDragging()">
                 
                 <!-- Shadow -->
                 <rect x="-2" y="-2" width="105" height="4" rx="2" fill="rgba(0,0,0,0.15)" transform="translate(2, 2)" pointer-events="none" />

                 <!-- Main Hand -->
                 <rect x="0" y="-3" width="105" height="6" rx="3" [attr.fill]="color()" pointer-events="none" />
                 
                 <!-- Counter Weight -->
                 <rect x="-25" y="-3" width="25" height="6" rx="3" [attr.fill]="color()" pointer-events="none" />
                 
                 <!-- Center Circle -->
                 <circle cx="0" cy="0" r="8" [attr.fill]="color()" pointer-events="none" />
                 <circle cx="0" cy="0" r="3" fill="white" pointer-events="none" />
                 
              </g>
            </g>

            <!-- Center Pin Cap -->
            <circle cx="0" cy="0" r="2" fill="#d1d5db" pointer-events="none" />

          </g>
        </svg>

      </div>
    </div>
  `
})
export class VisualClockComponent {
  timeLeft = input.required<number>();
  maxTime = input.required<number>();
  isRunning = input.required<boolean>();
  label = input<string>('TIMER');
  color = input<string>('#f97316'); // Default orange
  
  toggle = output<void>();
  timeChange = output<number>();

  isDragging = signal(false);

  private lastSeconds = 0;
  
  // Audio sources - SWAPPED as requested
  // Toggle gets light-switch-81967
  private toggleSound = new Audio('https://raw.githubusercontent.com/SoYoung210/craft/main/static/audio/light-switch-81967.mp3');
  // Drag gets tick-short
  private dragSound = new Audio('https://raw.githubusercontent.com/SoYoung210/craft/main/static/audio/tick-short.mp3'); 

  constructor() {
    this.toggleSound.volume = 0.5;
    this.dragSound.volume = 0.4;
  }

  handleToggle() {
    this.toggleSound.currentTime = 0;
    this.toggleSound.play().catch(() => {});
    this.toggle.emit();
  }

  ticks = computed(() => {
    const ticksArray = [];
    const radius = 125; 
    const tickLenSmall = 6;
    const tickLenBig = 12;
    const textRadius = 100;

    for (let i = 0; i < 60; i++) {
      const angleDeg = i * 6; 
      const angleRad = (angleDeg - 90) * (Math.PI / 180);

      const isMajor = i % 5 === 0;
      const len = isMajor ? tickLenBig : tickLenSmall;

      const x1 = radius * Math.cos(angleRad);
      const y1 = radius * Math.sin(angleRad);
      const x2 = (radius - len) * Math.cos(angleRad);
      const y2 = (radius - len) * Math.sin(angleRad);

      let tx = 0, ty = 0;
      let label = '';

      if (isMajor) {
         tx = textRadius * Math.cos(angleRad);
         ty = textRadius * Math.sin(angleRad);
         const hour = i === 0 ? 12 : i / 5;
         label = hour.toString();
      }

      ticksArray.push({ angle: i, x1, y1, x2, y2, isMajor, tx, ty, label });
    }
    return ticksArray;
  });

  formattedTime = computed(() => {
    const t = this.timeLeft();
    const minutes = Math.floor(t / 60);
    const seconds = t % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  handTransform = computed(() => {
     const ratio = this.timeLeft() / 3600; 
     const deg = ratio * 360;
     return `rotate(${deg}deg)`;
  });

  wedgePath = computed(() => {
    const totalSeconds = 3600;
    let s = this.timeLeft();
    if (s > totalSeconds) s = totalSeconds;
    if (s < 0) s = 0;

    const fraction = s / totalSeconds;
    const degrees = fraction * 360;
    const r = 125;

    if (degrees >= 360) {
      return `M 0 -${r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 -${r}`;
    }
    
    if (degrees <= 0.1) return '';

    const rads = (degrees * Math.PI) / 180;
    const x = r * Math.cos(rads);
    const y = r * Math.sin(rads);
    const largeArcFlag = degrees > 180 ? 1 : 0;
    
    return `M 0 0 L ${r} 0 A ${r} ${r} 0 ${largeArcFlag} 1 ${x} ${y} Z`;
  });

  // Drag Interaction Logic
  onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    
    // Prevent dragging if the timer is running
    if (this.isRunning()) return;

    this.isDragging.set(true);
    // Track initial seconds to avoid playing sound on initial click
    this.lastSeconds = this.timeLeft();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    this.calculateTimeFromPointer(event);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging()) return;
    this.calculateTimeFromPointer(event);
  }

  onPointerUp(event: PointerEvent) {
    if (this.isDragging()) {
      this.isDragging.set(false);
      (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    }
  }

  private calculateTimeFromPointer(event: PointerEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;

    // Angle calculation
    let angleRad = Math.atan2(dy, dx);
    let degrees = angleRad * (180 / Math.PI);
    degrees += 90;
    if (degrees < 0) {
      degrees += 360;
    }

    let seconds = Math.round((degrees / 360) * 3600);
    seconds = Math.max(0, Math.min(3600, seconds));

    // Play sound if minute increment changes (simulating gear click per minute)
    // There are 60 minutes in the circle.
    const currentMinute = Math.floor(seconds / 60);
    const lastMinute = Math.floor(this.lastSeconds / 60);

    if (currentMinute !== lastMinute) {
      this.dragSound.currentTime = 0;
      this.dragSound.play().catch(() => {});
    }
    
    this.lastSeconds = seconds;
    this.timeChange.emit(seconds);
  }
}