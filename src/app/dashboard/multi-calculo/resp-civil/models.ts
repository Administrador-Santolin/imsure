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