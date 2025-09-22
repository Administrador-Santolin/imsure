import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EspecialidadeInfo, Precos, RcQuoteInput, RcQuoteResult } from '../../../models/respCivil.model';
import { RespCivilService } from './unimed.client';
import { RouterModule } from '@angular/router';
import { AkadClient } from '../../../services/akad.client';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { RCMultiService } from '../../../services/RCMulti.service';
import { startWith } from 'rxjs/operators';
import { FairfaxClient } from '../../../services/fairfax.client';

@Component({
  selector: 'app-resp-civil',
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule,
    MatAutocompleteModule, MatInputModule, MatSliderModule, MatButtonModule, MatSlideToggleModule, MatCardModule, MatCheckboxModule],
  templateUrl: './resp-civil.html',
  styleUrl: './resp-civil.scss'
})

export class RespCivil implements OnInit {
  especialidadeSelecionada: string = '';
  coberturaSelecionada: number = 50000;
  temChefe: boolean = false;
  temDiretor: boolean = false;
  residente: boolean = false;
  peritoMedico: boolean = false;

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
    // 🎓 EXPLICAÇÃO: Filtra só os procedimentos que estão marcados (ativo = true)
    const procedimentosAtivos = this.procedimentosAtuais
      .filter(procedimento => procedimento.ativo) // ← Só os marcados
      .map(procedimento => procedimento.id); // ← Pega só o ID
    
    return procedimentosAtivos;
  }

  carregando = false;
  resultadoAkad: RcQuoteResult | null = null;
  resultadoFF: RcQuoteResult | null = null;

  async cotarTodas(): Promise<void> {
    // 🎓 EXPLICAÇÃO: Primeiro, vamos mostrar que está carregando
    this.carregando = true;

    // 🎓 EXPLICAÇÃO: Limpamos os resultados anteriores
    this.resultadoAkad = null;
    this.resultadoFF = null;
    this.precosCalculados = null;

    this.calcularPreco();

    await this.cotarAkad();

    await this.cotarFairfax();

    this.carregando = false;
  }

  private _filter(value: string): EspecialidadeInfo[] {
    const filterValue = value.toLowerCase();
    return this.especialidades.filter(option => option.nome.toLowerCase().includes(filterValue));
  }


  private async buildRcQuoteInputMinimo(): Promise<RcQuoteInput> {
    const especialidadeKey = this.especialidadeSelecionadaId || this.filtroEspecialidade.value || '';
    const procedimentosAtivos = this.getProcedimentosAtivos();

    return {
      // 1) da sua tela atual
      especialidadeId: especialidadeKey, // qualquer id que mapeie p/ classe interna
      cobertura: Number(this.coberturaSelecionada || 100000),
      // se você já tiver o CRM em algum input, troque aqui:
      crm: '18999', // <-- TEMPORÁRIO para testar

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
      targets: { akad: true, fairfax: true, local: true },

      // 4) extras específicos da Akad (franquia 3 como sugerido na doc)
      extras: {
        fairfax: {
          residente: this.residente,          // RESIDENT
          peritoMedico: this.peritoMedico,       // MEDICAL-EXPERT
          territorialidade: 'BR',
          escopo: 'NATIONAL',
          // Se precisar, você pode permitir override das categorias:
          // Dedutível: a Fairfax manda um array de pares [ {LIMIT}, {DEDUCTIBLE} ].
          // Vamos guardar o que a tela escolher e o service monta a estrutura.
          dedutivel: 'MINIMUM', // DEDUCTIBLE code
          categories: [],
          procedures: procedimentosAtivos
        }
      },

      // 5) dados pessoais fixos (se quiser já mandar por aqui)
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

  // �� EXPLICAÇÃO: Variável que guarda os procedimentos da especialidade atual
  procedimentosAtuais: any[] = [];

  // 🎓 EXPLICAÇÃO: Variável que controla se os procedimentos estão visíveis
  procedimentosVisiveis: boolean = false;

  ngOnInit(): void {
    // Inscreve-se no Observable para garantir que os dados do serviço foram carregados
    // Carrega as especialidades do enquadramento
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
    // 🎓 EXPLICAÇÃO: Primeiro, vamos descobrir qual é a classe da especialidade
    // (MEDICO_SEM_CIRURGIA, MEDICO_COM_CIRURGIA, ou OBSTETRA)

    // 🎓 EXPLICAÇÃO: Procura a especialidade na lista carregada
    const especialidade = this.especialidades.find(e => e.id === especialidadeId);

    if (!especialidade) {
      console.warn('⚠️ Especialidade não encontrada:', especialidadeId);
      this.procedimentosVisiveis = false;
      return;
    }

    // 🎓 EXPLICAÇÃO: Pega a classe da especialidade (ex: 'MEDICO_SEM_CIRURGIA')
    const classeEspecialidade = especialidade.classe;

    // 🎓 EXPLICAÇÃO: Busca os procedimentos correspondentes na nossa tabela
    const procedimentos = this.procedimentosPorEspecialidade[classeEspecialidade];

    if (!procedimentos) {
      console.warn('⚠️ Procedimentos não encontrados para classe:', classeEspecialidade);
      this.procedimentosVisiveis = false;
      return;
    }
    // 🎓 EXPLICAÇÃO: Atualiza a lista de procedimentos atuais
    this.procedimentosAtuais = [...procedimentos]; // Cria uma cópia
    // 🎓 EXPLICAÇÃO: Mostra os procedimentos na tela
    this.procedimentosVisiveis = true;
  }

  onEspecialidadeSelected(espec: EspecialidadeInfo) {
    this.especialidadeSelecionadaId = espec.id;                 // guardamos o id
    this.filtroEspecialidade.setValue(espec.nome, { emitEvent: false }); // mantém o nome no input
    this.atualizarProcedimentos(espec.id);
  }

  onEscolherEspecialidade(opcao: { id: string; nome: string }) {
    this.especialidadeSelecionada = opcao.nome;
  }

  // Método chamado pelo botão de cálculo
  calcularPreco(): void {
    this.precosCalculados = this.respCivilService.obterPrecos(
      this.filtroEspecialidade.value || '',
      this.coberturaSelecionada,
      this.temChefe,
      this.temDiretor
    );
  }
}
