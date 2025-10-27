export type RCInternalClass =
  | 'MEDICO_COM_CIRURGIA'
  | 'MEDICO_SEM_CIRURGIA'
  | 'OBSTETRA'
  | 'CIRURGIAO_PLASTICO'; 

export type CarrierId = 'FF' | 'Akad';

export interface EspecialidadeRaw {
  id: string;          // ex.: 'dermatologia'
  nome: string;        // ex.: 'Dermatologia'
  enquadramento: RCInternalClass; // nossa classe interna (o que vc já salvou)
}

export interface EspecialidadeInfo {
  id: string;
  nome: string;
  classe: RCInternalClass;
}

export interface Precos {
    totalAVista: number;
    parcelas6x: number;
    parcelas10x: number;
  }
  
  export interface TabelaPrecoItem {
    grupo: string;
    cobertura: number;
    precos: {
      semChefeSemDiretor: Precos;
      comChefeSemDiretor: Precos;
      semChefeComDiretor: Precos;
      comChefeComDiretor: Precos;
    };
  }
  
  export interface SimulacaoData {
    tabelaPrecos: TabelaPrecoItem[];
    legendasEspecialidades: { [key: string]: string | null };
  }

  export type RcSinistralidade5Anos = 'NENHUM' | 'UM' | 'DOIS'; //Akad Q6 1 = nenhum, 2 = 1 sinistro, 3 = 2 sinistros, 4 = 3 ou mais (não aceita)  
  export type RcReclamacoes12m = 'NENHUM' | 'UMA'; //Akad Q7 1 = nenhum, 2 = 1 reclamação, 3 = 2 ou mais (não aceita)
  export type RcRetroatividadeAnos = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  export type RcCustoDefesa = 'STANDARD' | 'PLUS'; // Custo de defesa (Akad Q35)
  export type RcCongenere = 'NOVO' | 'RENOVACAO';
  
  export interface RcExtrasAkad {
    // Se você quiser usar "Seguradora Anterior" (Q2) quando NOVO = Não:
    seguradoraAnterior?: string | null;
  
    // Franquia: em Akad é um código (ex.: 3). Se você usar sempre 3, pode deixar default no service.
    franquiaCodigo?: number;
  
    // Datas de vigência da última apólice (Q13/Q14) — só quando NOVO = Não
    ultimaVigenciaInicioISO?: string | null; // '2023-01-09T03:00:00.000Z'
    ultimaVigenciaFimISO?: string | null;
  }
  
  // Fairfax: tem “RESIDENT”, “MEDICAL-EXPERT”, “PROCEDURES-ACTIVITIES”, etc.
  export interface RcExtrasFairfax {
    residente?: boolean;          // RESIDENT
    peritoMedico?: boolean;       // MEDICAL-EXPERT
    procedures?: string[]; // PROCEDURES-ACTIVITIES (códigos da API)
    territorialidade?: 'BR' | 'WORLD';
    escopo?: 'NATIONAL' | 'INTERNATIONAL';
    categoriasOverride?: string[]; // ex.: ['OBSTETRICIAN'] (senão derivamos pela classe interna)
    // Dedutível: a Fairfax manda um array de pares [ {LIMIT}, {DEDUCTIBLE} ].
    // Vamos guardar o que a tela escolher e o service monta a estrutura.
    limite?: number;              // LIMIT
    dedutivel?: 'DEFAULT' | 'PLUS' | string; // DEDUCTIBLE code
    categories?: string[]; // CATEGORIES
    retroatividadeFF: number;
    sinistralidadeFF: number;
  }
  
  // === Entrada única para cotar (o "form" unificado) ===
  export interface RcQuoteInput {
    especialidadeId: string;
    classeInterna?: RCInternalClass; // opcional: se já estiver resolvida
  
    // Dados profissionais comuns
    crm: string;                   // Akad Q5 / Fairfax PROFESSIONAL-REGISTER
    cobertura: number;             // valor (R$). Akad mapeia para uma opção; Fairfax usa número direto
    sinistralidade5Anos: RcSinistralidade5Anos; // Akad Q6
    totalSinistros5Anos?: number | null;        // Akad Q37 (obrigatório se sinistralidade != NENHUM)
    reclamacoes12m: RcReclamacoes12m;           // Akad Q7 (regra: só se houve sinistro, pode ser > 1)
    conhecimentoPrevio: boolean;                // Akad Q8
    reclamantes?: string | null;                // Akad Q9 (se conhecimentoPrevio = true)
    retroatividadeAnos: RcRetroatividadeAnos;   // Akad Q11 / Fairfax RETROACTIVITY (0 = Sem)
    congenere: RcCongenere;                     // Akad Q12 / Fairfax CONGENER: 'NEW' vs 'RENEWAL'
    custoDefesa: RcCustoDefesa;                 // Akad Q35
    dataInicioVigencia: Date;                   // Akad EffectiveDate / Fairfax START-VIGENCY-DATE
    targets: {
      akad: boolean;
      fairfax: boolean;
      local: boolean;
    };
  
    // Dados pessoais (Fairfax pede muitos; você disse que serão estáticos)
    // Você pode deixá-los fora do form e configurar no service, mas se quiser mover para cá, pode:
    dadosPessoaisFixos?: {
      nome?: string;
      email?: string;
      cpf?: string;
      celular?: string;
      endereco?: {
        cep?: string;
        rua?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
      };
      comissaoCorretoraPercent?: number; // Fairfax BROKERAGE-COMMISSION
    };
  
    // Extras específicos por seguradora
    extras?: {
      akad?: RcExtrasAkad;
      fairfax?: RcExtrasFairfax;
    };
  }
  
  export interface RcQuoteResult {
    carrier: CarrierId;
    carrierLabel: string;   // nome para mostrar no card
    moeda: 'BRL';
    premioTotal: number;    // principal (à vista ou total)
    parcelas6x?: number;
    parcelas10x?: number;
    quoteId?: string;       // id da cotação quando a API retornar
    franquia?: string;
    raw?: any;              // resposta crua (debug)
    error?: string;         // mensagem de erro amigável (se falhou)
    maxSemJurosParcelas?: string,
    maxSemJurosValor?:    string,
    pagamentosDisponiveis?: string[],

  }
  
