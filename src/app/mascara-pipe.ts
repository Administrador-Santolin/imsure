import { Pipe, PipeTransform } from '@angular/core';
import { NgxMaskService } from 'ngx-mask';

@Pipe({
  name: 'mascara'
})
export class MascaraPipe implements PipeTransform {
  constructor(private maskService: NgxMaskService) {}

  transform(value: string | number, mask: string): string {
    if (!value) {
      return '';
    }

    // O valor precisa ser uma string para a máscara funcionar
    const valorLimpo = String(value).replace(/\D/g, ''); 
    return this.maskService.applyMask(valorLimpo, mask);
  }
}
