// 3 caixinhas que as seguradoras entendem:
export type RCInternalClass =
  | 'MEDICO_COM_CIRURGIA'
  | 'MEDICO_SEM_CIRURGIA'
  | 'OBSTETRA'
  | 'CIRURGIAO_PLASTICO'; 

// id curto da seguradora (você escolhe os nomes)
export type CarrierId = 'FF' | 'Akad';


// como vem a especialidade do seu JSON “enquadramento-especialidades.json”
export interface EspecialidadeRaw {
  id: string;          // ex.: 'dermatologia'
  nome: string;        // ex.: 'Dermatologia'
  enquadramento: RCInternalClass; // nossa classe interna (o que vc já salvou)
}

// representação já normalizada pra lookup rápido
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
  
  // === Quem vamos cotar ===
  // Use nomes curtinhos para identificar cada fonte de cotação.
  export type RcCarrierId = 'Akad' | 'FF' | 'Unimed';
  
  // === Classe interna (a "caixinha" padrão da corretora) ===
  // Você já usa isso no enquadramento por especialidade.
  
  // === Campos comuns do seu formulário (independente da seguradora) ===
  
  // Sinistros nos últimos 5 anos (Akad Q6)
  // 1 = nenhum, 2 = 1 sinistro, 3 = 2 sinistros, 4 = 3 ou mais (não aceita)
  export type RcSinistralidade5Anos = 'NENHUM' | 'UM' | 'DOIS' | 'TRES_OU_MAIS';
  
  // Reclamações nos últimos 12 meses (Akad Q7)
  // 1 = nenhum, 2 = 1 reclamação, 3 = 2 ou mais (não aceita)
  export type RcReclamacoes12m = 'NENHUM' | 'UMA' | 'DUAS_OU_MAIS';
  
  // Retroatividade (anos). Em Akad tem códigos (1..5,6=Sem), em Fairfax é número.
  // Vamos guardar como número de anos; 0 = Sem retroatividade.
  export type RcRetroatividadeAnos = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  
  // Custo de defesa (Akad Q35)
  export type RcCustoDefesa = 'STANDARD' | 'PLUS';
  
  // Situação de congênere (seguro anterior)
  // Akad usa 1=Sim / 2=Não. Em Fairfax “CONGENER: NEW/RENEWAL”.
  // Aqui guardamos de forma simples:
  export type RcCongenere = 'NOVO' | 'RENOVACAO';
  
  // === Extras por seguradora (cada uma tem seus campos específicos) ===
  
  // Akad: hoje o exemplo não pede "residente"; tem franquia, datas, etc.
  // Deixe só o que é específico mesmo; o resto vem dos campos comuns.
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
    procedimentosAtividades?: string[]; // PROCEDURES-ACTIVITIES (códigos da API)
    territorialidade?: 'BR' | 'WORLD';
    escopo?: 'NATIONAL' | 'INTERNATIONAL';
    // Se precisar, você pode permitir override das categorias:
    categoriasOverride?: string[]; // ex.: ['OBSTETRICIAN'] (senão derivamos pela classe interna)
    // Dedutível: a Fairfax manda um array de pares [ {LIMIT}, {DEDUCTIBLE} ].
    // Vamos guardar o que a tela escolher e o service monta a estrutura.
    limite?: number;              // LIMIT
    dedutivel?: 'DEFAULT' | 'PLUS' | string; // DEDUCTIBLE code
  }
  
  // === Entrada única para cotar (o "form" unificado) ===
  export interface RcQuoteInput {
    // O que vem da escolha de especialidade (você pode só passar o id e o service de
    // enquadramento resolve a classe).
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
  
    // Quem cotar (checkboxes)
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
  
  // === Saída padronizada para a UI (um card por fonte) ===
  export interface RcQuoteResult {
    carrier: RcCarrierId;
    carrierLabel: string;   // nome para mostrar no card
    moeda: 'BRL';
    premioTotal: number;    // principal (à vista ou total)
    parcelas6x?: number;
    parcelas10x?: number;
    quoteId?: string;       // id da cotação quando a API retornar
    raw?: any;              // resposta crua (debug)
    error?: string;         // mensagem de erro amigável (se falhou)
    maxSemJurosParcelas?: string,
    maxSemJurosValor?:    string,
    pagamentosDisponiveis?: string[],

  }
  
