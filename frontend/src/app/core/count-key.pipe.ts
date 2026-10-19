import { Pipe, PipeTransform } from '@angular/core';

// ngx-translate has no plural rules; English and German both only need a
// separate singular, kept under the same key with an _ONE suffix.
@Pipe({ name: 'countKey', standalone: true })
export class CountKeyPipe implements PipeTransform {
  transform(key: string, count: number): string {
    return count === 1 ? `${key}_ONE` : key;
  }
}
