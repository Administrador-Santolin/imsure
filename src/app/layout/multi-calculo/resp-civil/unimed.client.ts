import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SimulacaoData } from '../../../models/respCivil.model'; // Ajuste o caminho conforme necessário

@Injectable({
  providedIn: 'root'
})
export class RespCivilService {
  private dataSimulacao: SimulacaoData | null = null;
  private dataSimulacaoCarregada = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.carregarDadosSimulacao();
  }

  private carregarDadosSimulacao(): void {
    this.http.get<SimulacaoData>('tabelaUnimed.json')
      .pipe(
        catchError(error => {
          console.error('Erro ao carregar dados de simulação:', error);
          return of(null);
        })
      )
      .subscribe(data => {
        this.dataSimulacao = data;
        this.dataSimulacaoCarregada.next(true);
      });
  }

  dadosCarregados(): Observable<boolean> {
    return this.dataSimulacaoCarregada.asObservable();
  }

  obterPrecos(especialidade: string, cobertura: number, temChefe: boolean, temDiretor: boolean) {
     console.log('Valor da cobertura recebida:', cobertura, 'Tipo:', typeof cobertura);

    if (!this.dataSimulacao) {
      console.warn('Dados de simulação ainda não foram carregados.');
      return null;
    }

    const grupo = this.dataSimulacao.legendasEspecialidades[especialidade];
    if (!grupo) {
      console.error(`Grupo para a especialidade "${especialidade}" não encontrado.`);
      return null;
    }

    const item = this.dataSimulacao.tabelaPrecos.find(
      (item) => item.grupo === grupo && item.cobertura === cobertura
    );

    if (!item) {
      console.error(`Preços não encontrados para o grupo "${grupo}" com cobertura de R$${cobertura}.`);
      return null;
    }

    if (temChefe && temDiretor) {
      return item.precos.comChefeComDiretor;
    } else if (temChefe && !temDiretor) {
      return item.precos.comChefeSemDiretor;
    } else if (!temChefe && temDiretor) {
      return item.precos.semChefeComDiretor;
    } else {
      return item.precos.semChefeSemDiretor;
    }
  }

  obterEspecialidades(): string[] {
    if (!this.dataSimulacao) {
      return [];
    }
    return Object.keys(this.dataSimulacao.legendasEspecialidades);
  }

  obterCoberturasDisponiveis(): number[] {
    if (!this.dataSimulacao) {
      return [];
    }
    const coberturasSet = new Set<number>();
    this.dataSimulacao.tabelaPrecos.forEach(item => coberturasSet.add(item.cobertura));
    return Array.from(coberturasSet).sort((a, b) => a - b);
  }
}
