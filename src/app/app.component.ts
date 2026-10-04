import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';

export interface Exercise {
  id: string;
  name: string;
  url: string;
  sets: string;
  reps: string;
  weight: string;
  rest: string;
}

export interface Day {
  id: string;
  name: string;
  exercises: Exercise[];
}

type ExerciseField = Exclude<keyof Exercise, 'id'>;

const STORAGE_KEY = 'entrenos.v1';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const newExercise = (): Exercise => ({
  id: uid(), name: '', url: '', sets: '', reps: '', weight: '', rest: '',
});

function loadDays(): Day[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as Day[]) : [];
  } catch {
    return [];
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  /** Estado único de la app. Cada cambio se guarda solo en localStorage. */
  readonly days = signal<Day[]>(loadDays());
  readonly savedAt = signal<Date | null>(null);
  readonly saveError = signal(false);

  constructor() {
    effect(
      () => {
        const days = this.days();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(days));
          this.saveError.set(false);
          this.savedAt.set(new Date());
        } catch {
          this.saveError.set(true);
        }
      },
      { allowSignalWrites: true },
    );

    // Si la app está abierta en dos pestañas, se mantienen sincronizadas.
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) this.days.set(loadDays());
    });
  }

  // ---- Días ----
  addDay(): void {
    const n = this.days().length + 1;
    this.days.update((d) => [...d, { id: uid(), name: `Día ${n}`, exercises: [newExercise()] }]);
  }

  renameDay(dayId: string, name: string): void {
    this.days.update((d) => d.map((x) => (x.id === dayId ? { ...x, name } : x)));
  }

  duplicateDay(day: Day): void {
    const copy: Day = {
      id: uid(),
      name: `${day.name} (copia)`,
      exercises: day.exercises.map((e) => ({ ...e, id: uid() })),
    };
    this.days.update((d) => {
      const i = d.findIndex((x) => x.id === day.id);
      return [...d.slice(0, i + 1), copy, ...d.slice(i + 1)];
    });
  }

  removeDay(day: Day): void {
    if (!confirm(`¿Eliminar "${day.name}" y todos sus ejercicios?`)) return;
    this.days.update((d) => d.filter((x) => x.id !== day.id));
  }

  // ---- Ejercicios ----
  addExercise(dayId: string): void {
    this.days.update((d) =>
      d.map((x) => (x.id === dayId ? { ...x, exercises: [...x.exercises, newExercise()] } : x)),
    );
  }

  removeExercise(dayId: string, exId: string): void {
    this.days.update((d) =>
      d.map((x) =>
        x.id === dayId ? { ...x, exercises: x.exercises.filter((e) => e.id !== exId) } : x,
      ),
    );
  }

  setField(dayId: string, exId: string, field: ExerciseField, value: string): void {
    this.days.update((d) =>
      d.map((x) =>
        x.id === dayId
          ? { ...x, exercises: x.exercises.map((e) => (e.id === exId ? { ...e, [field]: value } : e)) }
          : x,
      ),
    );
  }

  /** Normaliza el enlace para poder abrirlo (añade https:// si falta). */
  href(url: string): string | null {
    const v = url.trim();
    if (!v) return null;
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }

  value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
