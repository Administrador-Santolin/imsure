import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  EspecialidadeInfo,
  Precos,
  RcQuoteInput,
  RcQuoteResult,
  RcSinistralidade5Anos,
  RcReclamacoes12m,
  RcRetroatividadeAnos
} from '../../../models/respCivil.model';
import { RespCivilService } from './unimed.client';
import { RouterModule } from '@angular/router';
import { AkadClient } from '../../../services/akad.client';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { RCMultiService } from '../../../services/RCMulti.service';
import { startWith } from 'rxjs/operators';
import { FairfaxClient } from '../../../services/fairfax.client';

@Component({
  selector: 'app-resp-civil',
  imports: [ CommonModule, FormsModule, RouterModule, ReactiveFormsModule,
    MatAutocompleteModule, MatInputModule, MatSliderModule, MatButtonModule, MatSlideToggleModule, MatCardModule, MatCheckboxModule ],
  templateUrl: './resp-civil.html',
  styleUrl: './resp-civil.scss'
})

export class RespCivil implements OnInit {
  especialidadeSelecionada: string = '';
  coberturaSelecionada: number = 300000;
  temChefe: boolean = false;
  temDiretor: boolean = false;
  residente: boolean = false;
  peritoMedico: boolean = false;
  sinistralidade5anos: number = 0;
  sinistralidade24meses: number = 0;
  sinistralidade12meses: number = 0;
  somaSinistros: number = 0;
  conhecimentoPrevio: boolean = false;
  nomeReclamantes: string = '';
  retroatividade: number = 0;

  // Listas para os menus drop-down
  especialidades: EspecialidadeInfo[] = [];
  coberturas: number[] = [];

  filtroEspecialidade = new FormControl('');
  especialidadesFiltradas: EspecialidadeInfo[] = [];
  especialidadeSelecionadaId: string = '';

  // Variável para armazenar o resultado do cálculo
  precosCalculados: Precos | null = null;

  constructor(
    private respCivilService: RespCivilService,
    private akad: AkadClient,
    private rcEnq: RCMultiService,
    private fairfax: FairfaxClient
  ) {
  }

  private getProcedimentosAtivos(): string[] {
    const procedimentosAtivos = this.procedimentosAtuais
      .filter(procedimento => procedimento.ativo)
      .map(procedimento => procedimento.id);

    return procedimentosAtivos;
  }

  carregando = false;
  resultadoAkad: RcQuoteResult | null = null;
  resultadoFF: RcQuoteResult | null = null;

  async cotarTodas(): Promise<void> {
    this.carregando = true;
    this.resultadoAkad = null;
    this.resultadoFF = null;
    this.precosCalculados = null;

    this.calcularPreco();

    await this.cotarAkad();

    await this.cotarFairfax();

    this.carregando = false;
  }

  private converterSinistralidade5Anos(valor: number): RcSinistralidade5Anos {
    if (valor === 0) return 'NENHUM';
    if (valor === 1) return 'UM';
    if (valor === 2) return 'DOIS';
    return 'NENHUM';
  }

  private converterReclamacoes12m(valor: number): RcReclamacoes12m {
    if (valor === 0) return 'NENHUM';
    if (valor === 1) return 'UMA';
    return 'NENHUM';
  }

  private converterRetroatividadeFairfax(valor: number): number {
    if (valor < 0) return 0;
    if (valor > 5) return 5;
    return valor;
  }

  private converterRetroatividadeAkad(valor: number): RcRetroatividadeAnos {
    if (valor < 0 || valor > 10) return 0;
    return valor as RcRetroatividadeAnos;
  }

  private async buildRcQuoteInputMinimo(): Promise<RcQuoteInput> {
    const especialidadeKey = this.especialidadeSelecionadaId || this.filtroEspecialidade.value || '';
    const procedimentosAtivos = this.getProcedimentosAtivos();

    // 🎓 CONVERSÃO: Transforma os valores do formulário para o formato da API
    const sinistralidade5 = this.converterSinistralidade5Anos(this.sinistralidade5anos);
    const reclamacoes12 = this.converterReclamacoes12m(this.sinistralidade12meses);
    const retroativAkad = this.converterRetroatividadeAkad(this.retroatividade);

    return {
      especialidadeId: especialidadeKey,
      cobertura: Number(this.coberturaSelecionada || 100000),
      crm: '18999',
      sinistralidade5Anos: sinistralidade5,
      totalSinistros5Anos: sinistralidade5 !== 'NENHUM' ? this.somaSinistros : null,
      reclamacoes12m: reclamacoes12,
      conhecimentoPrevio: this.conhecimentoPrevio,
      reclamantes: this.conhecimentoPrevio ? this.nomeReclamantes : null,
      retroatividadeAnos: retroativAkad,
      congenere: 'NOVO',
      custoDefesa: 'STANDARD',
      dataInicioVigencia: new Date(),
      targets: { akad: true, fairfax: true, local: true },
      extras: {
        fairfax: {
          residente: this.residente,
          peritoMedico: this.peritoMedico,
          territorialidade: 'BR',
          escopo: 'NATIONAL',
          dedutivel: 'MINIMUM',
          categories: [],
          procedures: procedimentosAtivos,
          sinistralidadeFF: this.sinistralidade24meses,
          retroatividadeFF: this.converterRetroatividadeFairfax(this.retroatividade)
        }
      },
      dadosPessoaisFixos: {
        nome: 'Dr. Medico',
        email: 'apolices@santolinseguros.com.br',
        cpf: '00000000191'
      }
    };
  }

  async cotarAkad(): Promise<void> {
    this.resultadoAkad = null;
    const input = await this.buildRcQuoteInputMinimo();

    this.akad.cotar(input).subscribe({
      next: (r) => {
        this.resultadoAkad = r;
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
      }
    });
  }

  async cotarFairfax(): Promise<void> {
    this.resultadoFF = null;
    const input = await this.buildRcQuoteInputMinimo(); // o mesmo que você usa

    this.fairfax.cotar(input).subscribe(r => {
      // adicione o card da Fairfax ao array de resultados
      this.resultadoFF = r;
      console.log('FAIRFAX RESULT:', r);
    });
  }

  especialidadesOpcoes: { id: string; nome: string }[] = [];

  private procedimentosPorEspecialidade = {
    'MEDICO_SEM_CIRURGIA': [
      { id: 'AESTHETIC-PROCEDURES', nome: 'Procedimentos Estéticos Minimamente Invasivos.', ativo: false },
      { id: 'ENDOSCOPY-COLONOSCOPY', nome: 'Endoscopia e/ou Colonoscopia.', ativo: false },
      { id: 'RADIOTHERAPY-CHEMOTHERAPY-IMMUNOTHERAPY', nome: 'Radioterapia e/ou Quimioterapia e/ou Imunoterapia.', ativo: false },
      { id: 'HAIR-IMPLANT-TRANSPLANT', nome: 'Procedimentos Estéticos relacionados à Implante e Transplante Capilar.', ativo: false }
    ],

    'MEDICO_COM_CIRURGIA': [
      { id: 'AESTHETIC-PROCEDURES', nome: 'Procedimentos Estéticos Minimamente Invasivos.', ativo: false },
      { id: 'AESTHETIC-PROCEDURES-MEDICAL-SPECIALTY', nome: 'Procedimentos Estéticos relacionados à Especialidade Médica.', ativo: false },
      { id: 'ENDOSCOPY-COLONOSCOPY', nome: 'Endoscopia e/ou Colonoscopia.', ativo: false },
      { id: 'RADIOTHERAPY-CHEMOTHERAPY-IMMUNOTHERAPY', nome: 'Radioterapia e/ou Quimioterapia e/ou Imunoterapia.', ativo: false },
      { id: 'HAIR-IMPLANT-TRANSPLANT', nome: 'Procedimentos Estéticos relacionados à Implante e Transplante Capilar.', ativo: false }
    ],

    'OBSTETRA': [
      { id: 'AESTHETIC-PROCEDURES', nome: 'Procedimentos Estéticos Minimamente Invasivos.', ativo: false },
      { id: 'AESTHETIC-PROCEDURES-MEDICAL-SPECIALTY', nome: 'Procedimentos Estéticos relacionados à Especialidade Médica.', ativo: false },
      { id: 'ENDOSCOPY-COLONOSCOPY', nome: 'Endoscopia e/ou Colonoscopia.', ativo: false },
      { id: 'RADIOTHERAPY-CHEMOTHERAPY-IMMUNOTHERAPY', nome: 'Radioterapia e/ou Quimioterapia e/ou Imunoterapia.', ativo: false },
      { id: 'HAIR-IMPLANT-TRANSPLANT', nome: 'Procedimentos Estéticos relacionados à Implante e Transplante Capilar.', ativo: false }
    ],

    'CIRURGIAO_PLASTICO': [
      { id: 'ENDOSCOPY-COLONOSCOPY', nome: 'Endoscopia e/ou Colonoscopia.', ativo: false },
      { id: 'RADIOTHERAPY-CHEMOTHERAPY-IMMUNOTHERAPY', nome: 'Radioterapia e/ou Quimioterapia e/ou Imunoterapia.', ativo: false }
    ]
  };

  procedimentosAtuais: any[] = [];
  procedimentosVisiveis: boolean = false;

  ngOnInit(): void {
    this.rcEnq.getEspecialidades().subscribe(list => {
      this.especialidadesOpcoes = list.map(x => ({ id: x.id, nome: x.nome }));
      this.especialidades = list;
      this.especialidadesFiltradas = list;
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

  private atualizarProcedimentos(especialidadeId: string): void {
    const especialidade = this.especialidades.find(e => e.id === especialidadeId);

    if (!especialidade) {
      console.warn('⚠️ Especialidade não encontrada:', especialidadeId);
      this.procedimentosVisiveis = false;
      return;
    }

    const classeEspecialidade = especialidade.classe;
    const procedimentos = this.procedimentosPorEspecialidade[classeEspecialidade];

    if (!procedimentos) {
      console.warn('⚠️ Procedimentos não encontrados para classe:', classeEspecialidade);
      this.procedimentosVisiveis = false;
      return;
    }
    this.procedimentosAtuais = [...procedimentos];
    this.procedimentosVisiveis = true;
  }

  onEspecialidadeSelected(espec: EspecialidadeInfo) {
    this.especialidadeSelecionadaId = espec.id;
    this.filtroEspecialidade.setValue(espec.nome, { emitEvent: false });
    this.atualizarProcedimentos(espec.id);
  }

  onEscolherEspecialidade(opcao: { id: string; nome: string }) {
    this.especialidadeSelecionada = opcao.nome;
  }

  calcularPreco(): void {
    this.precosCalculados = this.respCivilService.obterPrecos(
      this.filtroEspecialidade.value || '',
      this.coberturaSelecionada,
      this.temChefe,
      this.temDiretor
    );
  }
}
