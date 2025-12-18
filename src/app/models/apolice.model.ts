export interface Apolice {
    id?: string,
    clienteId: string,
    clienteNome: string,
    apolice: string,
    proposta: string,
    seguradora: string,
    produto: string,
    subTipoDocumento: string,
    inicioVigencia: Date | any,
    fimVigencia: Date | any,
    dataEmissao: Date | any,
    createdAt?: Date | any,
    tipoSeguro: string, // Radio group: 'novo', 'renovacao', 'renovacaoOutra'
    situacao: string, // Radio group: 'ativo', 'vencido', etc.
    formaPagamento: FormaPagamento,
    itensSegurados: ItemSegurado[],
}

export interface ItemSegurado {
    id: string;            // p/ trackBy e remoção rápida
    produto: string;       // 'Residencial', 'Automóvel', 'RespCivil', etc.
    details: any;          // depois você tipa melhor por produto
}

export interface FormaPagamento {// Informações Financeiras (subgrupo aninhado, para o Expansion Panel) ({
    formaPagamento: string,
    parcelas: number,
    vencimentoPrimeiraParcela: Date | any,
    comissaoPercentual: number,
    premioLiquido: number,
    iofPercentual: number,
    premioTotal: number
}

export interface AutomovelDetails {
    fabricante: string;
    modelo: string;
    anoFabricacao: string;
    anoModelo: string;
    placa: string;
    chassi: string;
    fipe: string;
    cepRisco: string;
}

export interface RespCivilDetails {
    nome: string;
    registroProfissional: string;
    especialidade: string[];
}

// locais-details.model.ts
export interface LocaisDetails {
    rua: string;
    numero: number | null;
    complemento?: string | null;
    cep: string;
    bairro: string;
    cidade: string;
    estado: string;
}

export enum SituacaoApolice {
    ATIVA = 'Ativa',
    CANCELADA = 'Cancelada',
    RENOVADA = 'Renovada',
    VENCIDA = 'Vencida',
    NAO_RENOVADA = 'Não Renovada',
    PERDA_TOTAL = 'Perda Total',
    PENDENTE = 'Pendente'
}

export enum tipoNegocio {
    NOVO = 'Novo',
    RENOVACAO = 'Renovação',
    RENOVACAO_OUTRA = 'Renovação Outra'
}

// 🎓 EXPLICAÇÃO: Helper functions para converter Enum para Array
export function getEnumValues(enumObj: any): string[] {
    return Object.values(enumObj);
}

export function getEnumKeys(enumObj: any): string[] {
    return Object.keys(enumObj);
}

