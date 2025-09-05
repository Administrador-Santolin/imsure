import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { RcQuoteInput, RcQuoteResult } from '../models/respCivil.model';

/**
 * Client da FAIRFAX — monta o payload no formato “answers[]” e normaliza o retorno para RcQuoteResult.
 * Observação: como ainda não temos um exemplo de response oficial, a normalização é tolerante
 * e tenta achar campos comuns (totalAmount/premium/netPremium/paymentOptions).
 */
@Injectable({ providedIn: 'root' })
export class FairfaxClient {
  private http = inject(HttpClient);
  readonly id = 'fairfax';
  readonly label = 'Fairfax';
  private cfg = environment.fairfax;

  cotar(input: RcQuoteInput): Observable<RcQuoteResult> {
    if (!this.cfg?.quotationUrl) {
      return of({
        carrier: this.id, carrierLabel: this.label, moeda: 'BRL', premioTotal: 0,
        error: 'Fairfax: defina fairfax.quotationUrl no environment'
      });
    }

    const payload = this.buildPayload(input);
    const headers = this.buildHeaders();

    return this.http.post<any>(this.cfg.quotationUrl, payload, { headers }).pipe(
      map(resp => this.toQuoteResult(resp)),
      catchError(err => of({
        carrier: this.id, carrierLabel: this.label, moeda: 'BRL', premioTotal: 0,
        error: this.explainHttpError(err),
        raw: err
      }))
    );
  }

  // ---------- Montagem do payload (answers[]) ----------

  private buildPayload(input: RcQuoteInput) {
    const classe = input.classeInterna; // já vem do seu enquadramento (Akad/Fairfax usam a mesma lógica)
    const isObstetra = classe === 'OBSTETRA';

    // Mapas simples p/ Fairfax
    const congenere = input.congenere === 'NOVO' ? 'NEW' : 'EXISTING';
    const retro = Number(input.retroatividadeAnos || 0);
    const limit = Number(input.cobertura || 0);

    // Procedimentos/flags específicos (opcionais)
    const resident = !!input.extras?.fairfax?.resident;
    const procedures = Array.isArray(input.extras?.fairfax?.procedures)
      ? input.extras!.fairfax!.procedures : []; // ex.: ['AESTHETIC-PROCEDURES', 'ENDOSCOPY-COLONOSCOPY', ...]

    // Deductible (franquia) — Fairfax usa ‘DEFAULT’ por padrão, mas permita override
    const deductibleCode = input.extras?.fairfax?.deductible ?? 'DEFAULT';

    const answers: any[] = [
      { code: 'MODALITY',                answer: 'MEDICAL-CIVIL-LIABILITY' },
      { code: 'MEDICAL-EXPERT',          answer: true },
      { code: 'PERSON-TYPE',             answer: 'NATURAL' },
      { code: 'CONGENER',                answer: congenere },
      { code: 'START-VIGENCY-DATE',      answer: this.toIsoDate(input.dataInicioVigencia || new Date()) },
      { code: 'IDENTITY',                answer: input.dadosPessoaisFixos?.cpf ?? '' },
      { code: 'INSURED-NAME',            answer: input.dadosPessoaisFixos?.nome ?? '' },
      { code: 'INSURED-EMAIL',           answer: input.dadosPessoaisFixos?.email ?? '' },
      // CRM / registro profissional
      { code: 'PROFESSIONAL-REGISTER',   answer: input.crm ?? '' },

      // Categoria: só envia OBSTETRICIAN se a classe for obstetra
      ...(isObstetra ? [{ code: 'CATEGORIES', answer: ['OBSTETRICIAN'] }] : []),

      // Residente (algumas cotações pedem)
      { code: 'RESIDENT',                answer: resident },

      // Procedimentos (se a sua tela coletar isso)
      ...(procedures.length ? [{ code: 'PROCEDURES-ACTIVITIES', answer: procedures }] : []),

      { code: 'RETROACTIVITY',           answer: retro },

      // Sinistros: Fairfax usa “CLAIMS” como string
      { code: 'CLAIMS',                  answer: this.mapClaims(input.sinistralidade5Anos) },

      // Conhecimento prévio → expectation
      { code: 'CLAIM-EXPECTATION',       answer: !!input.conhecimentoPrevio },

      // Território/escopo padrão Brasil
      { code: 'TERRITORIALITY',          answer: 'BR' },
      { code: 'SCOPE',                   answer: 'NATIONAL' },

      // Limite + franquia (estrutura em matriz, como no exemplo)
      {
        code: 'LIMIT-DEDUCTIBLE',
        answer: [[
          { code: 'LIMIT',      answer: limit },
          { code: 'DEDUCTIBLE', answer: deductibleCode }
        ]]
      }
    ];

    const body = {
      operationCode: this.cfg.operationCode ?? 'MEDICAL-CIVIL-LIABILITY-PARTNER',
      // Algumas integrações pedem "registerNumber" fora de answers — use o CRM
      registerNumber: input.crm ?? '',
      answers
    };

    return body;
  }

  // ---------- Normalização do retorno para RcQuoteResult ----------

  private toQuoteResult(resp: any): RcQuoteResult {
    // Tentar identificar o valor “à vista”
    const avista =
      this.asNumber(resp?.totalAmount) ??
      this.asNumber(resp?.premium) ??
      this.asNumber(resp?.grossPremium) ??
      this.asNumber(resp?.netPremium) ?? 0;

    // Se tiver estrutura parecida com a Akad (paymentOptions), reaproveitamos
    const p6  = this.pickInstallmentAmount(resp, 6);
    const p10 = this.pickInstallmentAmount(resp, 10);

    // Máximo sem juros (se existir algo tipo paymentOptions[*].installments[].interestValue)
    const maxNoInterest = this.findMaxNoInterest(resp);

    return {
      carrier: this.id,
      carrierLabel: this.label,
      moeda: 'BRL',
      premioTotal: avista,
      parcelas6x: p6 ?? undefined,
      parcelas10x: p10 ?? undefined,
      maxSemJurosParcelas: maxNoInterest?.n,
      maxSemJurosValor: maxNoInterest?.amount,
      pagamentosDisponiveis: this.listPaymentTypes(resp),
      raw: resp
    } as any;
  }

  // ---------- Helpers ----------

  private buildHeaders(): HttpHeaders {
    let h = new HttpHeaders({ 'Content-Type': 'application/json;charset=UTF-8' });
    if (this.cfg?.apiKeyHeader && this.cfg?.apiKeyValue) {
      h = h.set(this.cfg.apiKeyHeader, this.cfg.apiKeyValue);
    }
    if (this.cfg?.bearerToken) {
      h = h.set('Authorization', `Bearer ${this.cfg.bearerToken}`);
    }
    return h;
  }

  private toIsoDate(d: Date): string {
    try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); }
  }

  private mapClaims(sin: RcQuoteInput['sinistralidade5Anos']): string {
    // mapeia para texto esperado pela Fairfax (ex.: "0", "1", "2", "3+")
    switch ((sin || 'NENHUM').toUpperCase()) {
      case 'NENHUM':      return '0';
      case '01_SINISTRO': return '1';
      case '02_SINISTROS':return '2';
      case '03+':
      case '03_OU_MAIS':  return '3+';
      default:            return '0';
    }
  }

  private asNumber(v: any): number | undefined {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private listPaymentTypes(resp: any): string[] {
    const opts = Array.isArray(resp?.paymentOptions) ? resp.paymentOptions : [];
    const set = new Set<string>();
    for (const o of opts) {
      const t = String(o?.type ?? '').trim();
      if (t) set.add(t);
    }
    return Array.from(set);
  }

  private pickInstallmentAmount(resp: any, n: number): number | undefined {
    const opts = Array.isArray(resp?.paymentOptions) ? resp.paymentOptions : [];
    let best: number | undefined;
    for (const opt of opts) {
      const insts = Array.isArray(opt?.installments) ? opt.installments : [];
      const hit = insts.find((i: any) => Number(i?.installmentNumber) === n);
      if (!hit) continue;
      const val = Number(hit?.totalInstallment ?? hit?.totalValue);
      if (!Number.isFinite(val)) continue;
      best = best === undefined ? val : Math.min(best, val);
    }
    return best;
  }

  private findMaxNoInterest(resp: any): { n: number; amount: number } | null {
    const opts = Array.isArray(resp?.paymentOptions) ? resp.paymentOptions : [];
    let maxN = 0;
    let bestAmount: number | undefined;

    for (const opt of opts) {
      const insts = Array.isArray(opt?.installments) ? opt.installments : [];
      for (const it of insts) {
        const n = Number(it?.installmentNumber);
        const interest = Number(it?.interestValue ?? it?.insterestValue ?? 0);
        if (!Number.isFinite(n)) continue;
        if (interest === 0) {
          const val = Number(it?.totalInstallment ?? it?.totalValue);
          if (!Number.isFinite(val)) continue;
          if (n > maxN) { maxN = n; bestAmount = val; }
          else if (n === maxN) { bestAmount = Math.min(bestAmount ?? val, val); }
        }
      }
    }
    if (!maxN || bestAmount === undefined) return null;
    return { n: maxN, amount: bestAmount };
  }

  private explainHttpError(e: any): string {
    const status = e?.status;
    const msg = e?.error?.message || e?.message || 'Erro';
    return status ? `${status} - ${msg}` : msg;
  }
}
