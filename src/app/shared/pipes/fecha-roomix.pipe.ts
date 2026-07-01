import { Pipe, PipeTransform } from '@angular/core';
import { formatearFechaDisplay, formatearFechaHoraDisplay } from '../../core/utils/date.util';

@Pipe({ name: 'fechaRoomix', standalone: true })
export class FechaRoomixPipe implements PipeTransform {
  transform(value: string | null | undefined, mode: 'datetime' | 'date' = 'datetime'): string {
    return mode === 'date' ? formatearFechaDisplay(value) : formatearFechaHoraDisplay(value);
  }
}
