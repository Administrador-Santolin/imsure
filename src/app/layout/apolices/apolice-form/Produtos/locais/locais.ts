import { ChangeDetectionStrategy, Component, forwardRef, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AbstractControl, ControlValueAccessor, FormBuilder, FormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { LocaisDetails } from '../../../../../models/apolice.model';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-locais',
  imports: [CommonModule, ReactiveFormsModule,
    MatTabsModule, MatFormFieldModule, MatInputModule, NgxMaskDirective
  ],
  templateUrl: './locais.html',
  styleUrl: './locais.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Locais), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => Locais), multi: true }
  ]
})
export class Locais implements ControlValueAccessor {

  private fb = inject(FormBuilder);

  fg: FormGroup = this.fb.group({
    rua: ['', Validators.required],
      numero: [null, [Validators.required, Validators.min(1)]],
      complemento: [''],
      cep: ['', Validators.required],
      bairro: ['', Validators.required],
      cidade: ['', Validators.required],
      estado: ['', Validators.required],
    },
    { updateOn: 'blur' }
  );

  private onChange: (value: LocaisDetails) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.fg.valueChanges.subscribe(v => this.onChange(v as LocaisDetails));
  }

   // ===== CVA: o que cada método faz (em uma frase) =====
  // writeValue: pai manda um valor inicial -> preenche meu mini-form.
  writeValue(value: LocaisDetails | null): void {
    if (value) {
      this.fg.patchValue(value, { emitEvent: false });
    } else {
      this.fg.reset(
        { rua: '', numero: null, complemento: '', cep: '', bairro: '', cidade: '', estado: '' },
        { emitEvent: false }
      );
    }
  }

  // registerOnChange: pai fornece a função para eu avisar quando meu valor muda.
  registerOnChange(fn: (value: LocaisDetails) => void): void {
    this.onChange = fn;
  }

  // registerOnTouched: pai fornece a função para eu avisar quando fui "tocado".
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // setDisabledState: pai diz "habilita/desabilita" -> eu aplico no meu mini-form.
  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.fg.disable({ emitEvent: false }) : this.fg.enable({ emitEvent: false });
  }

  // ===== Validator: permite que a (in)validez suba para o pai =====
  validate(_: AbstractControl): ValidationErrors | null {
    return this.fg.valid ? null : { locaisInvalid: true };
  }

  // helper: chame isso nos (blur) dos inputs para marcar "tocou"
  markTouched() {
    this.onTouched();
  }

}
