import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxMaskDirective } from 'ngx-mask';

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
  styleUrl: './automovel.scss'
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
  });

  constructor() {
  }
}
