export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface Cliente {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
  genero: string;
  estadoCivil: string;
  endereco: Endereco; // Referência à interface de Endereço
  created_at?: Date;
  updated_at?: Date;
}

export type ClienteCreate = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>;

export type ClienteUpdate = Partial<ClienteCreate>;