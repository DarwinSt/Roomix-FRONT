import { Provider } from '@angular/core';
import { MAT_DATE_FORMATS, MatDateFormats } from '@angular/material/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { es } from 'date-fns/locale';
import { MAT_DATE_LOCALE } from '@angular/material/core';

export const ROOMIX_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'dd/MM/yyyy',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

export const ROOMIX_DATE_PROVIDERS: Provider[] = [
  provideDateFnsAdapter(),
  { provide: MAT_DATE_LOCALE, useValue: es },
  { provide: MAT_DATE_FORMATS, useValue: ROOMIX_DATE_FORMATS },
];
