import type { ScheduleResult } from "../core/index";
import type { TuningMode } from "../transport/store";

export interface VizState {
  result: ScheduleResult;
  beat: number;
  tuning: TuningMode;
  reducedMotion: boolean;
}

export interface Viz {
  readonly id: string;
  readonly label: string;
  mount(host: HTMLElement): void;
  draw(state: VizState): void;
  resize(): void;
  destroy(): void;
}
