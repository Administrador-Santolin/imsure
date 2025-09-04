import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, forwardRef, inject } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormBuilder, FormGroup, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxMaskDirective } from 'ngx-mask';
import { LocaisDetails, RespCivilDetails } from '../../../../../models/apolice.model';

@Component({
  selector: 'app-resp-civil',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatInputModule, MatSelectModule, MatTabsModule, MatFormFieldModule
  ],
  templateUrl: './resp-civil.html',
  styleUrl: './resp-civil.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RespCivil), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => RespCivil), multi: true }
  ]
})

export class RespCivil implements ControlValueAccessor {
  private fb = inject(FormBuilder);
  respCivilForm: FormGroup = this.fb.group({
    nome: ['', Validators.required],
    registroProfissional: ['', Validators.required],
    especialidade: ['', Validators.required]
  })

  private onChange: (value: RespCivilDetails) => void = () => {}
  private onTouched: () => void = () => {}

  contructor() {
    this.respCivilForm.valueChanges.subscribe(v => this.onChange(v as RespCivilDetails))
  }

  writeValue(value: RespCivilDetails | null): void {
    if (value) {
      this.respCivilForm.patchValue(value, { emitEvent: false });
    } else {
      this.respCivilForm.reset(
        { nome: '', registroProfissional: '', especialidade: '' },
        { emitEvent: false }
      );
    }
  }

  // registerOnChange: pai fornece a função para eu avisar quando meu valor muda.
  registerOnChange(fn: (value: RespCivilDetails) => void): void {
    this.onChange = fn;
  }

  // registerOnTouched: pai fornece a função para eu avisar quando fui "tocado".
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // setDisabledState: pai diz "habilita/desabilita" -> eu aplico no meu mini-form.
  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.respCivilForm.disable({ emitEvent: false }) : this.respCivilForm.enable({ emitEvent: false });
  }

  // ===== Validator: permite que a (in)validez suba para o pai =====
  validate(_: AbstractControl): ValidationErrors | null {
    return this.respCivilForm.valid ? null : { respCivilInvalid: true };
  }

  // helper: chame isso nos (blur) dos inputs para marcar "tocou"
  markTouched() {
    this.onTouched();
  }
}
