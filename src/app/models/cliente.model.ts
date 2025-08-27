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
}

export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}
