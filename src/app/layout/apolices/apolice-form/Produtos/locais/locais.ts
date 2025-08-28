import { Component, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-locais',
  imports: [ CommonModule, 
    MatTabsModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule
  ],
  templateUrl: './locais.html',
  styleUrl: './locais.scss'
})
export class Locais {

  private fb = inject(FormBuilder);
  localSegurado = this.fb.group({
    cep: ['', Validators.required],
    rua: ['', Validators.required],
    numero: ['', Validators.required],
    complemento: [''],
    bairro: ['', Validators.required],
    cidade: ['', Validators.required],
    estado: ['', Validators.required]
  });

}
