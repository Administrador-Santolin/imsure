export interface Apolice {
    clienteId: string,
    clienteNome: string,
    apolice: string,
    proposta: string,
    seguradora: string,
    produto: string,
    subTipoDocumento: string,
    inicioVigencia: Date,
    fimVigencia: Date,
    dataEmissao: Date,
    tipoSeguro: string, // Radio group: 'novo', 'renovacao', 'renovacaoOutra'
    situacao: string, // Radio group: 'ativo', 'vencido', etc.
    formaPagamento: formpaPagamento
}

export interface formpaPagamento {// Informações Financeiras (subgrupo aninhado, para o Expansion Panel) ({
    formaPagamento: string,
    parcelas: number,
    vencimentoPrimeiraParcela: number,
    comissaoPercentual: number,
    premioLiquido: number,
    iofPercentual: number,
    premioTotal: number
}



