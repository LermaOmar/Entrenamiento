import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';

export interface Exercise {
  id: string;
  name: string;
  url: string;
  sets: string;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
}

export interface Day {
  id: string;
  name: string;
  exercises: Exercise[];
}

type ExerciseField = Exclude<keyof Exercise, 'id'>;

export interface GlossaryTerm {
  term: string;
  full: string;
  definition: string;
  example: string;
  tip: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'HIIT',
    full: 'High-Intensity Interval Training · Entrenamiento interválico de alta intensidad',
    definition:
      'Método que alterna bloques cortos de esfuerzo muy intenso con periodos de descanso o de actividad suave. Mejora la resistencia cardiovascular en poco tiempo.',
    example: '30 segundos al máximo + 30 segundos suaves, repetido de 6 a 10 rondas (con ejercicios como burpees, saltos o sprints).',
    tip: 'Es muy exigente: haz un buen calentamiento y deja siempre una buena técnica, aunque vayas rápido. En esta rutina es opcional.',
  },
  {
    term: 'RIR',
    full: 'Repetitions In Reserve · Repeticiones en reserva',
    definition:
      'Número de repeticiones que aún podrías hacer con buena técnica cuando terminas una serie. Sirve para medir lo cerca que estás del fallo sin tener que llegar a él.',
    example: 'RIR 0 = no podrías hacer ni una más. RIR 2 = podrías haber hecho 2 repeticiones más. RIR 3 = te quedaban 3 de margen.',
    tip: 'Si tu serie es de 12-15 repeticiones con RIR 2, debería costarte las últimas, pero sentir que aún tenías 2 en el depósito.',
  },
  {
    term: 'Fallo muscular',
    full: 'Muscular failure',
    definition:
      'Punto en el que ya no puedes completar otra repetición con la técnica correcta, aunque lo intentes. Equivale a RIR 0.',
    example: 'En unas flexiones, el momento en que no consigues subir otra vez sin romper la postura.',
    tip: 'Llegar al fallo genera mucha fatiga y no hace falta en todas las series. Si lo buscas, mejor en ejercicios seguros (gomas, máquinas) y no en los que pueden hacerte daño si fallas.',
  },
];

const STORAGE_KEY = 'entrenos.v1';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const newExercise = (): Exercise => ({
  id: uid(), name: '', url: '', sets: '', reps: '', weight: '', rest: '', notes: '',
});

const SEED_URL = 'rutina-base.csv';
const CSV_HEADER = ['dia', 'ejercicio', 'series', 'reps', 'peso', 'descanso', 'enlace', 'comentarios'];

function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const delim = first.includes(';') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

function daysFromCsv(text: string): Day[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  const idx = Object.fromEntries(CSV_HEADER.map((h) => [h, col(h)]));
  if (idx['dia'] < 0 || idx['ejercicio'] < 0) throw new Error('Formato CSV no válido');
  const get = (r: string[], k: string) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '');
  const days: Day[] = [];
  for (const r of rows.slice(1)) {
    const dayName = get(r, 'dia') || 'Día';
    let day = days.find((d) => d.name === dayName);
    if (!day) { day = { id: uid(), name: dayName, exercises: [] }; days.push(day); }
    const ex: Exercise = {
      id: uid(), name: get(r, 'ejercicio'), sets: get(r, 'series'), reps: get(r, 'reps'),
      weight: get(r, 'peso'), rest: get(r, 'descanso'), url: get(r, 'enlace'),
      notes: get(r, 'comentarios'),
    };
    if (ex.name || ex.sets || ex.reps || ex.weight || ex.rest || ex.url || ex.notes) day.exercises.push(ex);
  }
  return days;
}

function daysToCsv(days: Day[]): string {
  const esc = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [CSV_HEADER.join(';')];
  for (const d of days) {
    if (d.exercises.length === 0) lines.push([d.name, '', '', '', '', '', '', ''].map(esc).join(';'));
    for (const e of d.exercises)
      lines.push([d.name, e.name, e.sets, e.reps, e.weight, e.rest, e.url, e.notes].map(esc).join(';'));
  }
  return '\uFEFF' + lines.join('\r\n');
}

function hasStoredData(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return true; }
}

function loadDays(): Day[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return (data as Day[]).map((d) => ({
      ...d,
      exercises: (d.exercises ?? []).map((e) => ({ ...e, notes: e.notes ?? '' })),
    }));
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
  readonly message = signal<string>('');
  readonly view = signal<'entrenos' | 'glosario'>('entrenos');
  readonly glossary = GLOSSARY;
  /** No se escribe en localStorage hasta que la rutina base haya terminado de cargar. */
  private ready = true;
  readonly savedAt = signal<Date | null>(null);
  readonly saveError = signal(false);

  constructor() {
    effect(
      () => {
        const days = this.days();
        if (!this.ready) return;
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

    // Primera vez (o datos borrados): se parte de la rutina base public/rutina-base.csv.
    if (!hasStoredData()) {
      this.ready = false;
      this.fetchSeed()
        .then((d) => { this.ready = true; this.days.set(d); })
        .catch(() => { this.ready = true; this.days.set([]); });
    }

    // Si la app está abierta en dos pestañas, se mantienen sincronizadas.
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) this.days.set(loadDays());
    });
  }

  // ---- Rutina base / CSV ----
  private async fetchSeed(): Promise<Day[]> {
    const res = await fetch(SEED_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo leer la rutina base');
    return daysFromCsv(await res.text());
  }

  async resetToSeed(): Promise<void> {
    if (!confirm('¿Restaurar la rutina base? Se perderán los cambios que hayas hecho.')) return;
    try {
      this.days.set(await this.fetchSeed());
      this.notify('Rutina base restaurada');
    } catch {
      this.notify('No se pudo cargar la rutina base');
    }
  }

  exportCsv(): void {
    const blob = new Blob([daysToCsv(this.days())], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mis-entrenos.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.notify('CSV exportado');
  }

  async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const days = daysFromCsv(await file.text());
      if (days.length === 0) throw new Error('vacío');
      if (!confirm(`Se importarán ${days.length} día(s) y se reemplazará lo que tienes ahora. ¿Continuar?`)) return;
      this.days.set(days);
      this.notify('CSV importado');
    } catch {
      this.notify('El archivo no tiene el formato esperado');
    }
  }

  private notify(text: string): void {
    this.message.set(text);
    setTimeout(() => this.message.set(''), 3000);
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
