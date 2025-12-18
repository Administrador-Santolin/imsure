export interface Seguradora {
  id?: string;
  nome: string;
  cnpj: string;
  contatoComercial?: string;
  telefone?: string;
  email?: string;
  ativa?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SeguradoraCreate = Omit<Seguradora, 'id' | 'createdAt' | 'updatedAt'>;
export type SeguradoraUpdate = Partial<SeguradoraCreate>;