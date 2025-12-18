export interface Produto {
  id?: string;
  nome: string;
  tipoSeguro?: string;
  descricao?: string;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProdutoCreate = Omit<Produto, 'id' | 'createdAt' | 'updatedAt'>;
export type ProdutoUpdate = Partial<ProdutoCreate>;