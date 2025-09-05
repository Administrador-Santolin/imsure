import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../environments/environment';
import { RcQuoteInput, RcQuoteResult, CarrierId, RCInternalClass } from '../models/respCivil.model';
import { RCMultiService } from './RCMulti.service';

/**
 * Client da FAIRFAX — monta o payload no formato “answers[]” e normaliza o retorno para RcQuoteResult.
 * Observação: como ainda não temos um exemplo de response oficial, a normalização é tolerante
 * e tenta achar campos comuns (totalAmount/premium/netPremium/paymentOptions).
 */
@Injectable({ providedIn: 'root' })
export class FairfaxClient {
  private http = inject(HttpClient);
  readonly id: CarrierId = 'FF';
  readonly label = 'Fairfax';
  private cfg = environment.fairfax;
  private enq = inject(RCMultiService);

  cotar(input: RcQuoteInput): Observable<RcQuoteResult> {
    if (!this.cfg?.baseUrl) {
      return of({
        carrier: this.id, carrierLabel: this.label, moeda: 'BRL', premioTotal: 0,
        error: 'Fairfax: defina fairfax.baseUrl no environment'
      });
    }

    const payload = this.buildPayload(input);
    const headers = this.buildHeaders();

    return this.http.post<any>(this.cfg.baseUrl, payload, { headers }).pipe(
      map(resp => this.toQuoteResult(resp)),
      catchError(err => of({
        carrier: this.id,
        carrierLabel: this.label,
        moeda: 'BRL' as const, // Corrigido para garantir que seja do tipo literal "BRL"
        premioTotal: 0,
        error: this.explainHttpError(err),
        raw: err
      }))
    );
  }

  private getFairfaxCategories(input: RcQuoteInput): string[] {
    const classe = input.classeInterna as RCInternalClass;

    // pega o código traduzido pelo Enquadramento (ex.: 'NO-SURGERY')
    const base = this.enq.mapClasseToCarrierCode('FF', classe);
    if (!base) {
      throw new Error(`Sem mapeamento Fairfax para classe: ${classe}`);
    }

    // permite extras opcionais vindos do form (se existirem)
    const extras = Array.isArray(input.extras?.fairfax?.categories)
      ? input.extras!.fairfax!.categories
      : [];

    // devolve sempre ARRAY de strings, sem duplicatas
    return Array.from(new Set([base, ...extras]));
  }

  // ---------- Montagem do payload (answers[]) ----------
  private buildPayload(input: RcQuoteInput) {
    const classe = input.classeInterna; // já vem do seu enquadramento (Akad/Fairfax usam a mesma lógica)

    // Mapas simples p/ Fairfax
    const congenere = input.congenere === 'NOVO' ? 'NEW' : 'EXISTING';
    const retro = Number(input.retroatividadeAnos || 0);
    const limit = Number(input.cobertura || 0);

    // Procedimentos/flags específicos (opcionais)
    const resident = !!input.extras?.fairfax?.residente;
    const procedures = Array.isArray(input.extras?.fairfax?.procedures)
      ? input.extras!.fairfax!.procedures : []; // ex.: ['AESTHETIC-PROCEDURES', 'ENDOSCOPY-COLONOSCOPY', ...]

    // Deductible (franquia) — Fairfax usa ‘DEFAULT’ por padrão, mas permita override
    const deductibleCode = 'MINIMUM'; //input.extras?.fairfax?.dedutivel ??

    const answers: any[] = [
      { code: 'CATEGORIES', answer: this.getFairfaxCategories(input) },
      { code: 'INSURED-CELLPHONE', answer: '(11) 91111-2222' },
      { code: 'INSURED-ADDRESS-ZIPCODE', answer: '12345-123' },
      { code: 'INSURED-ADDRESS-STREET', answer: 'Nome da rua' },
      { code: 'INSURED-ADDRESS-NUMBER', answer: 'Número' },
      { code: 'INSURED-ADDRESS-COMPLEMENT', answer: '' },
      { code: 'INSURED-ADDRESS-NEIGHBORHOOD', answer: 'Bairro' },
      { code: 'INSURED-ADDRESS-CITY', answer: 'São Paulo' },
      { code: 'INSURED-ADDRESS-STATE', answer: 'SP' },
      { code: 'GRIEVANCE-DISCOUNT', answer: 0 },
      { code: 'INSURED-SOCIAL-NAME-AGREEMENT', answer: false },
      { code: 'MODALITY', answer: 'MEDICAL-CIVIL-LIABILITY' },
      { code: 'MEDICAL-EXPERT', answer: true },
      { code: 'PERSON-TYPE', answer: 'NATURAL' },
      { code: 'CONGENER', answer: congenere },
      { code: 'START-VIGENCY-DATE', answer: this.toIsoDate(input.dataInicioVigencia || new Date()) },
      { code: 'IDENTITY', answer: input.dadosPessoaisFixos?.cpf ?? '' },
      { code: 'INSURED-NAME', answer: input.dadosPessoaisFixos?.nome ?? '' },
      { code: 'INSURED-EMAIL', answer: input.dadosPessoaisFixos?.email ?? '' },
      // CRM / registro profissional
      { code: 'PROFESSIONAL-REGISTER', answer: input.crm ?? '' },

      // Residente (algumas cotações pedem)
      { code: 'RESIDENT', answer: resident },

      // Procedimentos (se a sua tela coletar isso)
      ...(procedures.length ? [{ code: 'PROCEDURES-ACTIVITIES', answer: procedures }] : []),

      { code: 'RETROACTIVITY', answer: retro },

      // Sinistros: Fairfax usa “CLAIMS” como string
      { code: 'CLAIMS', answer: this.mapClaims(input.sinistralidade5Anos) },

      // Conhecimento prévio → expectation
      { code: 'CLAIM-EXPECTATION', answer: !!input.conhecimentoPrevio },

      // Território/escopo padrão Brasil
      { code: 'TERRITORIALITY', answer: 'BR' },
      { code: 'SCOPE', answer: 'NATIONAL' },

      // Limite + franquia (estrutura em matriz, como no exemplo)
      {
        code: 'LIMIT-DEDUCTIBLE',
        answer: [[
          { code: 'LIMIT', answer: limit },
          { code: 'DEDUCTIBLE', answer: deductibleCode }
        ]]
      }
    ];

    const body = {
      operationCode: this.cfg.operationCode ?? 'MEDICAL-CIVIL-LIABILITY-PARTNER',
      // Algumas integrações pedem "registerNumber" fora de answers — use o CRM
      registerNumber: '232148243',
      answers
    };

    return body;
  }

  // ---------- Normalização do retorno para RcQuoteResult ----------
  private toQuoteResult(resp: any): RcQuoteResult {
    // Tentar identificar o valor “à vista”
    const item = resp?.item;
    const pr0 = item?.pricing?.[0];
    const price = pr0?.price;
    const payOps = pr0?.payment?.paymentOptions ?? []

    // 1) valor total à vista
    const premioTotal = Number(price?.totalValue) || 0;

    // 2) máximo sem juros (e ignoramos o valor da parcela, já que você não precisa mostrar)
    const maxNoInterest = this.findFFMaxNoInterest(payOps); // { n, amount }

    // 3) formas de pagamento
    const pagamentos = this.listFFPaymentTypes(payOps); // ex.: ['CreditCard','Ticket']

    // 4) franquia (texto legível)
    const franquiaTxt =
      price?.limitDeductible?.deductible?.answerText?.[0] // "Padrão - 10% ..."
      ?? price?.limitDeductible?.deductible?.answer?.[0]   // fallback se não vier o texto
      ?? null;

    return {
      carrier: this.id,
      carrierLabel: this.label,
      moeda: 'BRL',
      premioTotal,
      maxSemJurosParcelas: maxNoInterest?.n.toString() ?? undefined,
      pagamentosDisponiveis: pagamentos,
      franquia: franquiaTxt ?? undefined,
      raw: resp
    };
  }

  /** Máximo de parcelas sem juros no layout Fairfax (installmentInterest === 0) */
  private findFFMaxNoInterest(payOpts: any[]): { n: number; amount: number } | null {
    if (!Array.isArray(payOpts)) return null;
    let maxN = 0;
    let bestAmount: number | undefined;

    for (const opt of payOpts) {
      const insts = Array.isArray(opt?.installments) ? opt.installments : [];
      for (const it of insts) {
        const n = Number(it?.number);
        const interest = Number(it?.installmentInterest ?? it?.interestValue ?? 0);
        if (!Number.isFinite(n)) continue;
        if (interest === 0) {
          const val = Number(it?.installmentValue ?? it?.totalValue);
          if (!Number.isFinite(val)) continue;
          if (n > maxN) { maxN = n; bestAmount = val; }
          else if (n === maxN) { bestAmount = Math.min(bestAmount ?? val, val); }
        }
      }
    }
    if (!maxN || bestAmount === undefined) return null;
    return { n: maxN, amount: bestAmount };
  }

  /** Tipos de pagamento no layout Fairfax */
  private listFFPaymentTypes(payOpts: any[]): string[] {
    if (!Array.isArray(payOpts)) return [];
    const set = new Set<string>();
    for (const o of payOpts) {
      const t = String(o?.paymentType ?? o?.paymentMethod ?? '').trim();
      if (t) set.add(t);
    }
    return Array.from(set);
  }


  // ---------- Helpers ----------
  private buildHeaders(): HttpHeaders {
    let h = new HttpHeaders({ 'Content-Type': 'application/json;charset=UTF-8', 'Ocp-Apim-Subscription-Key': this.cfg.subscriptionKey });
    //if (this.cfg?.subscriptionKey && this.cfg?.subscriptionKey) {
    //h = h.set(this.cfg.subscriptionKey, this.cfg.subscriptionKey);
    //}

    return h;
  }

  private toIsoDate(d: Date): string {
    try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); }
  }

  private mapClaims(sin: RcQuoteInput['sinistralidade5Anos']): string {
    // mapeia para texto esperado pela Fairfax (ex.: "0", "1", "2", "3+")
    switch ((sin || 'NENHUM').toUpperCase()) {
      case 'NENHUM': return '0';
      case '01_SINISTRO': return '1';
      case '02_SINISTROS': return '2';
      case '03+':
      case '03_OU_MAIS': return '3+';
      default: return '0';
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
