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
    itemSegurado: ItemSegurado[],
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

export interface Automovel {
    fabricante: string;
    modelo: string;
    anoFabricacao: number;
    anoModelo: number;
    placa: string;
    chassi: string;
    fipe: string;
    cepRisco: string;
}


