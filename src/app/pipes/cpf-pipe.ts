import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cpf'
})
export class CpfPipe implements PipeTransform {
  transform(value: string | number): string {
    const valor = value?.toString().replace(/\D/g, ''); // Remove não dígitos
    if (!valor || valor.length !== 11) {
      return value?.toString() || '';
    }

    // Aplica a máscara: XXX.XXX.XXX-XX
    return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}
