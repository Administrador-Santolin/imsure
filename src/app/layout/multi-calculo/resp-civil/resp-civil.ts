import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EspecialidadeInfo, Precos, RcQuoteInput, RcQuoteResult } from '../../../models/respCivil.model';
import { RespCivilService } from './resp-civil-service';
import { RouterModule } from '@angular/router';
import { AkadClient } from '../../../services/akad.client';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { RCMultiService } from '../../../services/RCMulti.service';
import { startWith } from 'rxjs/operators';

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
  especialidades: EspecialidadeInfo[] = [];
  coberturas: number[] = [];

  filtroEspecialidade = new FormControl('');
  especialidadesFiltradas: EspecialidadeInfo[] = [];
  especialidadeSelecionadaId: string = '';

  // Variável para armazenar o resultado do cálculo
  precosCalculados: Precos | null = null;

  constructor(private respCivilService: RespCivilService,
    private akad: AkadClient,
    private rcEnq: RCMultiService
  ) { 
  }

  carregandoAkad = false;
  resultadoAkad: RcQuoteResult | null = null;

  private _filter(value: string): EspecialidadeInfo[] {
    const filterValue = value.toLowerCase();
    return this.especialidades.filter(option => option.nome.toLowerCase().includes(filterValue));
  }


  private async buildRcQuoteInputMinimo(): Promise<RcQuoteInput> {
    const especialidadeKey = this.especialidadeSelecionadaId || this.filtroEspecialidade.value || '';
    const classe = await this.rcEnq.resolveClasse(especialidadeKey);
    
    return {
      // 1) da sua tela atual
      especialidadeId: especialidadeKey, // qualquer id que mapeie p/ classe interna
      cobertura: Number(this.coberturaSelecionada || 100000),
      // se você já tiver o CRM em algum input, troque aqui:
      crm: '123456', // <-- TEMPORÁRIO para testar
  
      // 2) defaults seguros (só p/ cotar agora)
      sinistralidade5Anos: 'NENHUM',
      totalSinistros5Anos: null,
      reclamacoes12m: 'NENHUM',
      conhecimentoPrevio: false,
      reclamantes: null,
      retroatividadeAnos: 0,        // 0 = sem retroatividade
      congenere: 'NOVO',            // “novo segurado”
      custoDefesa: 'STANDARD',
      dataInicioVigencia: new Date(), // hoje
  
      // 3) alvos (por enquanto só Akad)
      targets: { akad: true, fairfax: false, local: false },
  
      // 4) extras específicos da Akad (franquia 3 como sugerido na doc)
      extras: { akad: { franquiaCodigo: 3 } },
  
      // 5) dados pessoais fixos (se quiser já mandar por aqui)
      dadosPessoaisFixos: {
        nome: 'MEDICO PF API',
        email: 'parcerias-api@akadseguros.com.br',
        cpf: '00000000191'
      }
    };
  }
  
  async cotarAkad(): Promise<void> {
    this.carregandoAkad = true;
    this.resultadoAkad = null;
  
    const input = await this.buildRcQuoteInputMinimo();
  
    this.akad.cotar(input).subscribe({
      next: (r) => {
        this.resultadoAkad = r;
        this.carregandoAkad = false;
        console.log('AKAD RESULT:', r);
      },
      error: (e) => {
        this.resultadoAkad = {
          carrier: 'Akad',
          carrierLabel: 'Akad',
          moeda: 'BRL',
          premioTotal: 0,
          maxSemJurosParcelas: '',
          maxSemJurosValor: '',
          pagamentosDisponiveis: [],
          error: e?.message ?? 'Erro inesperado'
        };
        this.carregandoAkad = false;
      }
    });
  }

  especialidadesOpcoes: { id: string; nome: string }[] = [];
  
  ngOnInit(): void {
    // Inscreve-se no Observable para garantir que os dados do serviço foram carregados
    
    // Carrega as especialidades do enquadramento
    this.rcEnq.getEspecialidades().subscribe(list => {
      this.especialidadesOpcoes = list.map(x => ({ id: x.id, nome: x.nome }));
      this.especialidades = list;
      this.especialidadesFiltradas = list;
      console.table(list.map(x => ({ id: x.id, nome: x.nome, classe: x.classe })));
      console.log('ENQ carregado (nomes):', list.map(x => x.nome));
      // opcional: veja também os ids (slugs)
      console.log('ENQ ids:', list.map(x => x.id));
    });

    this.filtroEspecialidade.valueChanges
    .pipe(startWith(''))
    .subscribe(value => {
      const t = this.norm(typeof value === 'string' ? value : '');
      this.especialidadesFiltradas = this.especialidades.filter(e =>
        this.norm(e.nome).includes(t)
      );
    });
  }

  private norm(s: string): string {
    return (s || '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .toLowerCase().trim();
  }

  displayEspecialidade = (val: string | EspecialidadeInfo | null): string => {
    if (!val) return '';
    return typeof val === 'string' ? val : val.nome;
  };

  onEspecialidadeSelected(espec: EspecialidadeInfo) {
    this.especialidadeSelecionadaId = espec.id;                 // guardamos o id
    this.filtroEspecialidade.setValue(espec.nome, { emitEvent: false }); // mantém o nome no input
  }

  onEscolherEspecialidade(opcao: { id: string; nome: string }) {
    this.especialidadeSelecionada = opcao.nome;
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
