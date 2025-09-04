import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, forwardRef, inject } from '@angular/core';
import { AbstractControl, FormBuilder, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxMaskDirective } from 'ngx-mask';
import { AutomovelDetails, LocaisDetails } from '../../../../../models/apolice.model';

@Component({
  selector: 'app-automovel',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTabsModule,
    NgxMaskDirective
  ],
  templateUrl: './automovel.html',
  styleUrl: './automovel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Automovel), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => Automovel), multi: true }
  ]
})
export class Automovel {
  private fb = inject(FormBuilder);
  automovelForm = this.fb.group({
    fabricante: [''],
    modelo: [''],
    anoFabricacao: [''],
    anoModelo: [''],
    placa: [''],
    chassi: [''],
    fipe: [''],
    cepRisco: ['']
  },
    {
      updateOn: 'blur'
    });

  private onChange: (value: AutomovelDetails) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.automovelForm.valueChanges.subscribe(v => this.onChange(v as AutomovelDetails))
  }

  writeValue(value: LocaisDetails | null): void {
    if (value) {
      this.automovelForm.patchValue(value, { emitEvent: false });
    } else {
      this.automovelForm.reset(
        { rua: '', numero: null, complemento: '', cep: '', bairro: '', cidade: '', estado: '' },
        { emitEvent: false }
      );
    }
  }

  // registerOnChange: pai fornece a função para eu avisar quando meu valor muda.
  registerOnChange(fn: (value: AutomovelDetails) => void): void {
    this.onChange = fn;
  }

  // registerOnTouched: pai fornece a função para eu avisar quando fui "tocado".
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // setDisabledState: pai diz "habilita/desabilita" -> eu aplico no meu mini-form.
  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.automovelForm.disable({ emitEvent: false }) : this.automovelForm.enable({ emitEvent: false });
  }

  // ===== Validator: permite que a (in)validez suba para o pai =====
  validate(_: AbstractControl): ValidationErrors | null {
    return this.automovelForm.valid ? null : { automovelInvalid: true };
  }

  // helper: chame isso nos (blur) dos inputs para marcar "tocou"
  markTouched() {
    this.onTouched();
  }
}
