import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-resp-civil',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatInputModule, MatSelectModule, MatTabsModule, MatFormFieldModule,
    NgxMaskDirective
  ],
  templateUrl: './resp-civil.html',
  styleUrl: './resp-civil.scss'
})
export class RespCivil {

}
