export interface SeguradoraProduto {
  id?: string;
  seguradoraId: string;
  produtoId: string;
  codigoInterno?: string;
  nomeComercial?: string;
  ativo?: boolean;
  createdAt?: Date;
}

// 🎓 EXPLICAÇÃO: Interface expandida com dados relacionados (para exibição)
export interface SeguradoraProdutoDetalhado extends SeguradoraProduto {
  seguradoraNome?: string;
  produtoNome?: string;
  produtoTipo?: string;
}