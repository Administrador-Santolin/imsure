import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Precos } from './models';
import { RespCivilService } from './resp-civil-service';
import { RouterModule } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';


@Component({
  selector: 'app-resp-civil',
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule,
    MatAutocompleteModule, MatInputModule, MatSliderModule, MatButtonModule, MatSlideToggleModule, MatCardModule],
  templateUrl: './resp-civil.html',
  styleUrl: './resp-civil.scss'
})
export class RespCivil implements OnInit {
  especialidadeSelecionada: string = '';
  coberturaSelecionada: number = 50000;
  temChefe: boolean = false;
  temDiretor: boolean = false;

  // Listas para os menus drop-down
  especialidades: string[] = [];
  coberturas: number[] = [];

  filtroEspecialidade = new FormControl('');
  especialidadesFiltradas: string[] = [];

  // Variável para armazenar o resultado do cálculo
  precosCalculados: Precos | null = null;

  constructor(private respCivilService: RespCivilService) { }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.especialidades.filter(option => option.toLowerCase().includes(filterValue));
  }

  ngOnInit(): void {
    // Inscreve-se no Observable para garantir que os dados do serviço foram carregados
    this.respCivilService.dadosCarregados().subscribe(carregado => {
      if (carregado) {
        this.especialidades = this.respCivilService.obterEspecialidades();
        this.coberturas = this.respCivilService.obterCoberturasDisponiveis();
        this.especialidadesFiltradas = this.especialidades.slice();
      }
    });

    this.filtroEspecialidade.valueChanges.subscribe(value => {
      this.especialidadesFiltradas = this._filter(value ?? '');
    });
  }

  // Método chamado pelo botão de cálculo
  calcularPreco(): void {
    this.precosCalculados = this.respCivilService.obterPrecos(
      this.especialidadeSelecionada,
      this.coberturaSelecionada,
      this.temChefe,
      this.temDiretor
    );
    console.log('Preços calculados:', this.precosCalculados);
  }
}
