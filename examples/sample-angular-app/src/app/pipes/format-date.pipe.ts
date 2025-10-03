import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDate',
  standalone: true,
  pure: true
})
export class FormatDatePipe implements PipeTransform {
  transform(value: Date | string, format: string = 'short'): string {
    const date = typeof value === 'string' ? new Date(value) : value;

    if (format === 'short') {
      return date.toLocaleDateString();
    }

    return date.toLocaleString();
  }
}
