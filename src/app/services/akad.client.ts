import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
    CarrierId,
    RcCongenere,
    RcCustoDefesa,
    RCInternalClass,
    RcQuoteInput,
    RcQuoteResult,
    RcReclamacoes12m,
    RcRetroatividadeAnos,
    RcSinistralidade5Anos,
} from '../models/respCivil.model';
import { RCMultiService } from './RCMulti.service';
import { environment } from '../environments/environments';

/**
 * AkadClient
 * - Obtém token (password grant) com cabeçalhos exigidos (Subscription-Key + Client)
 * - (Opcional) consulta franquias e importâncias seguradas
 * - Converte RcQuoteInput -> payload "RiskAnalysis" + campos raiz e cota
 * - Normaliza a resposta para RcQuoteResult
 */
@Injectable({ providedIn: 'root' })
export class AkadClient {
    readonly id: CarrierId = 'Akad';
    readonly label = 'Akad';

    private http = inject(HttpClient);
    private enqu = inject(RCMultiService);

    // ==== CONFIG (ajuste no environment.ts) ====
    // Recomendado:
    // export const environment = {
    //   ...,
    //   akad: {
    //     subscriptionKey: '***',                 // Ocp-Apim-Subscription-Key
    //     clientHeader: 'argo_api_moderation',    // cabeçalho "Client"
    //     securityBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/security',
    //     tokenPath: '/connect/token',
    //     operationBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/operation/api',
    //     quotationBaseUrl: 'https://azuh3-br-api-platform.azure-api.net/quotation/api',
    //     operationCode: '',                      // se necessário
    //     username: '81510015000',                // <— sandbox
    //     password: '***',
    //     clientId: 'portal_argo',
    //     clientSecret: 'portal_argo_secret',
    //     brokerIdentityCPF: '81510015000',       // comentários da doc
    //     brokerageFirmCNPJ: null                 // ou CNPJ quando Assessoria
    //   }
    // }
    private cfg = environment.akad;

    // cache simples do token em memória
    private tokenState: { accessToken: string; expiresAt: number } | null = null;

    // ====== API pública: cotar ======
    cotar(input: RcQuoteInput): Observable<RcQuoteResult> {
        // 0) validações de negócio antes de chamar a API
        const invalid = this.prevalidate(input);
        if (invalid) {
            return of({
                carrier: this.id,
                carrierLabel: this.label,
                moeda: 'BRL',
                premioTotal: 0,
                error: invalid
            });
        }

        // 1) garantir classe interna (se não veio no input, resolve pelo enquadramento)
        const classe$ = input.classeInterna
            ? of(input.classeInterna)
            : new Observable<RCInternalClass>((sub) => {
                this.enqu.resolveClasse(input.especialidadeId)
                    .then((cls) => {
                        if (!cls) sub.error('Especialidade sem enquadramento para Akad');
                        else { sub.next(cls); sub.complete(); }
                    })
                    .catch((e) => sub.error(e));
            });

        // 2) build payload + chamar quotation com token
        return classe$.pipe(
            map((classe) => this.buildPayloadAkad({ ...input, classeInterna: classe })),
            switchMap((payload) =>
                this.authHeadersJson$().pipe(
                    switchMap((headers) =>
                        this.http.post<any>(
                            `${this.cfg.quotationBaseUrl}/quotation`,
                            payload,
                            { headers }
                        )
                    )
                )
            ),
            map((resp: any) => this.toQuoteResult(resp)),
            catchError((err) =>
                of({
                    carrier: this.id,
                    carrierLabel: this.label,
                    moeda: 'BRL',
                    premioTotal: 0,
                    error: this.friendlyError(err),
                    raw: err
                } as RcQuoteResult)
            )
        );
    }

    // ====== (Opcional) consultar franquias por atividades (Get Deductibles) ======
    // Envie 1, 2 e/ou 3 conforme as atividades. Se for uma só, mande uma só.
    getDeductiblesByClasses(classes: RCInternalClass[]): Observable<any> {
        const answers = classes.map((c) => this.mapEspecialidade(c)); // '1' | '2' | '3'
        const body = {
            questions: [{ questionId: '3', answers }],
            operationCode: this.cfg?.operationCode ?? ''
        };
        return this.authHeadersJson$().pipe(
            switchMap((headers) =>
                this.http.post<any>(
                    `${this.cfg.operationBaseUrl}/operations/get-deductibles`,
                    body,
                    { headers }
                )
            )
        );
    }

    // ====== (Opcional) consultar importâncias seguradas (Get Insured Amount) ======
    // ratingTableId é sempre 3, segundo a doc.
    getInsuredAmountByClasses(classes: RCInternalClass[]): Observable<any> {
        const numericAnswers = classes.map((c) => Number(this.mapEspecialidade(c))); // 1 | 2 | 3
        const body = {
            ratingTableId: 3,
            questions: [{ question: 3, answers: numericAnswers }],
            operationCode: this.cfg?.operationCode ?? ''
        };
        return this.authHeadersJson$().pipe(
            switchMap((headers) =>
                this.http.post<any>(
                    `${this.cfg.operationBaseUrl}/operations/get-insured-amount`,
                    body,
                    { headers }
                )
            )
        );
    }

    // ====== TOKEN ======

    // headers JSON com Authorization + Subscription-Key
    private authHeadersJson$(): Observable<HttpHeaders> {
        return this.getToken$().pipe(
            map((token) => {
                let h = new HttpHeaders({
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Authorization': `Bearer ${token}`,
                    'Ocp-Apim-Subscription-Key': 'b91d51eb223546e1b390afd6ade06814'
                });
                return h;
            })
        );
    }

    // obtém (e cacheia) o token; renova se faltarem < 60s
    private getToken$(): Observable<string> {
        const now = Date.now();
        if (this.tokenState && now < this.tokenState.expiresAt - 60_000) {
            return of(this.tokenState.accessToken);
        }
        return this.fetchToken().pipe(
            map((res) => {
                const accessToken: string = res?.access_token;
                const expiresIn: number = Number(res?.expires_in ?? 1800); // segundos
                this.tokenState = {
                    accessToken,
                    expiresAt: now + expiresIn * 1000
                };
                return accessToken;
            })
        );
    }

    // faz o POST x-www-form-urlencoded para obter o token
    private fetchToken(): Observable<{ access_token: string; expires_in: number }> {
        const url = `${this.cfg.securityBaseUrl}${this.cfg.tokenPath}`;
        const body = new URLSearchParams({
            grant_type: 'password',
            username: this.cfg.username,
            password: this.cfg.password,
            client_id: this.cfg.clientId,
            client_secret: this.cfg.clientSecret
        });

        const headers = new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Ocp-Apim-Subscription-Key': 'b91d51eb223546e1b390afd6ade06814',
            'Client': this.cfg.clientHeader
        });

        return this.http.post<any>(url, body.toString(), { headers }).pipe(
            catchError((err) => {
                const msg = this.friendlyError(err) || 'Falha ao obter token Akad.';
                return throwError(() => new Error(msg));
            })
        );
    }

    // ====== validações de negócio básicas ======
    private prevalidate(input: RcQuoteInput): string | null {
        // 3+ sinistros (5 anos) não aceita
        if (input.sinistralidade5Anos === 'TRES_OU_MAIS') {
            return 'Akad: 3 ou mais sinistros nos últimos 5 anos não é aceito.';
        }
        // Reclamações 12m > 0 só se houve sinistro (regra de front da doc)
        if (input.reclamacoes12m !== 'NENHUM' && input.sinistralidade5Anos === 'NENHUM') {
            return 'Akad: Reclamações em 12 meses só quando houve sinistro nos últimos 5 anos.';
        }
        // Custo de defesa PLUS >= 75.000
        if (input.custoDefesa === 'PLUS' && input.cobertura < 75000) {
            return 'Akad: Honorários Plus somente a partir de R$ 75.000 de cobertura.';
        }
        // Quando sinistralidade != NENHUM, totalSinistros5Anos é obrigatório
        if (input.sinistralidade5Anos !== 'NENHUM' && !input.totalSinistros5Anos) {
            return 'Akad: Informe o valor total de sinistros (Q37) quando houver sinistralidade.';
        }
        return null;
    }

    // ====== payload builder ======
    private buildPayloadAkad(input: RcQuoteInput & { classeInterna: RCInternalClass }) {
        const q: Array<{ questionId: string; answer: string | number | boolean | null }> = [];

        // Q1 - Novo segurado: 1=Sim (NOVO), 2=Não (RENOVAÇÃO)
        q.push({ questionId: '1', answer: this.mapNovoSegurado(input.congenere) });

        // Q2 - Seguradora anterior (só se RENOVAÇÃO)
        const extrasAkad = input.extras?.akad;
        if (this.mapNovoSegurado(input.congenere) === '2' && extrasAkad?.seguradoraAnterior) {
            q.push({ questionId: '2', answer: extrasAkad.seguradoraAnterior });
        }

        // Q3 - Especialidade (classe interna -> código Akad)
        q.push({ questionId: '3', answer: this.mapEspecialidade(input.classeInterna) });

        // Q4 - Importância Segurada (valor -> código Akad)
        q.push({ questionId: '4', answer: this.mapCobertura(input.cobertura) });

        // Q5 - CRM
        q.push({ questionId: '5', answer: String(input.crm) });

        // Q6 - Sinistralidade 5 anos
        q.push({ questionId: '6', answer: this.mapSinistralidade(input.sinistralidade5Anos) });

        // Q37 - Soma total sinistros (obrigatório se Q6 != 1; se 1, enviar null)
        if (input.sinistralidade5Anos !== 'NENHUM') {
            q.push({ questionId: '37', answer: Number(input.totalSinistros5Anos ?? 0).toFixed(2) });
        } else {
            q.push({ questionId: '37', answer: null });
        }

        // Q7 - Reclamações 12m
        q.push({ questionId: '7', answer: this.mapReclamacoes12m(input.reclamacoes12m) });

        // Q8 - Conhecimento prévio
        q.push({ questionId: '8', answer: this.mapSimNao(input.conhecimentoPrevio) });

        // Q9 - Reclamantes (se Q8=Sim e houver nomes)
        if (input.conhecimentoPrevio && input.reclamantes) {
            q.push({ questionId: '9', answer: input.reclamantes });
        }

        // Q11 - Retroatividade (anos -> código)
        q.push({ questionId: '11', answer: this.mapRetroatividade(input.retroatividadeAnos) });

        // Q12 - Congênere (1=Sim, 2=Não) — interpretamos: RENOVAÇÃO => 1, NOVO => 2
        q.push({ questionId: '12', answer: input.congenere === 'RENOVACAO' ? '1' : '2' });

        // Q13/Q14 - Vigência última apólice (se RENOVAÇÃO)
        if (this.mapNovoSegurado(input.congenere) === '2') {
            if (extrasAkad?.ultimaVigenciaInicioISO) {
                q.push({ questionId: '13', answer: extrasAkad.ultimaVigenciaInicioISO });
            }
            if (extrasAkad?.ultimaVigenciaFimISO) {
                q.push({ questionId: '14', answer: extrasAkad.ultimaVigenciaFimISO });
            }
        }

        // Q35 - Custo de defesa
        q.push({ questionId: '35', answer: this.mapCustoDefesa(input.custoDefesa) });

        // Campos raiz
        const personal = this.buildPersonalData(input);
        const effectiveDate = this.toISODate(input.dataInicioVigencia);
        const franquia = extrasAkad?.franquiaCodigo ?? 3; // default 3

        const body: any = {
            OperationCode: this.cfg?.operationCode ?? '',
            RiskAnalysis: q,
            PersonalData: personal,
            EffectiveDate: effectiveDate,
            deductibleOption: franquia,
            // Broker/Assessoria conforme doc:
            BrokerIdentityPartyAdmin: this.cfg?.brokerIdentityCPF ?? null,
            BrokerageFirmIdentity: this.cfg?.brokerageFirmCNPJ ?? null,
            leadidentifier: null
            // campaignId / affinityGroupConditionId / advisoryFirmIdentity se necessário
        };

        return body;
    }

    // ====== normalizador de resposta ======
    private toQuoteResult(resp: any): RcQuoteResult {
        // À vista (vem como totalAmount no topo)
        const avista =
            Number(resp?.totalAmount) ||
            Number(resp?.paymentOptions?.[0]?.totalAmount) ||
            Number(resp?.netValue) || 0;

        // Parcelas 6x e 10x (pega a menor parcela encontrada em qualquer forma)
        const p6 = this.pickInstallmentAmount(resp, 6);
        const p10 = this.pickInstallmentAmount(resp, 10);

        // Máximo sem juros (n) + valor da parcela nessa máxima + quais tipos têm essa condição
        const maxNoInterest = this.findMaxNoInterest(resp);

        // Tipos de pagamento disponíveis
        const tiposPagamento = this.listPaymentTypes(resp);

        return {
            carrier: this.id,
            carrierLabel: this.label,
            moeda: 'BRL',
            premioTotal: avista,
            parcelas6x: p6,
            parcelas10x: p10,
            quoteId: resp?.identifier ?? String(resp?.id ?? ''),

            // 🔽 campos extras (opcionais, só para exibir no card)
            maxSemJurosParcelas: maxNoInterest?.n,
            maxSemJurosValor: maxNoInterest?.amount,
            pagamentosDisponiveis: tiposPagamento,

            raw: resp
        } as any; // (ok adicionar extras além do RcQuoteResult)
    }

    /** Menor valor de parcela para o número 'n' (varre todas as formas de pagamento) */
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

    /** Procura a MAIOR quantidade de parcelas com juros = 0; retorna n, valor (menor entre os tipos) e os tipos que permitem */
    private findMaxNoInterest(resp: any): { n: number; amount: number; types: string[] } | null {
        const opts = Array.isArray(resp?.paymentOptions) ? resp.paymentOptions : [];
        let maxN = 0;
        let bestAmount: number | undefined;
        const typesSet = new Set<string>();

        for (const opt of opts) {
            const t = String(opt?.type ?? '');
            const insts = Array.isArray(opt?.installments) ? opt.installments : [];
            for (const it of insts) {
                const n = Number(it?.installmentNumber);
                const interest = Number(it?.insterestValue ?? it?.interestValue ?? 0); // aceita ambas as grafias
                if (!Number.isFinite(n)) continue;
                if (interest === 0) {
                    const val = Number(it?.totalInstallment ?? it?.totalValue);
                    if (!Number.isFinite(val)) continue;

                    if (n > maxN) {
                        maxN = n;
                        bestAmount = val;
                        typesSet.clear();
                        if (t) typesSet.add(t);
                    } else if (n === maxN) {
                        // mesmo N: pega a MENOR parcela e adiciona o tipo
                        bestAmount = bestAmount === undefined ? val : Math.min(bestAmount, val);
                        if (t) typesSet.add(t);
                    }
                }
            }
        }

        if (maxN === 0 || bestAmount === undefined) return null;
        return { n: maxN, amount: bestAmount, types: Array.from(typesSet) };
    }

    /** Lista simples dos tipos de pagamento disponíveis (sem duplicar) */
    private listPaymentTypes(resp: any): string[] {
        const opts = Array.isArray(resp?.paymentOptions) ? resp.paymentOptions : [];
        const set = new Set<string>();
        for (const o of opts) {
            const t = String(o?.type ?? '').trim();
            if (t) set.add(t);
        }
        return Array.from(set);
    }

    private friendlyError(err: any): string {
        const msg =
            err?.error?.message ||
            err?.message ||
            'Falha ao cotar na Akad.';
        return String(msg);
    }

    // ====== HELPERS de mapeamento ======
    private mapNovoSegurado(congenere: RcCongenere): '1' | '2' {
        return congenere === 'NOVO' ? '1' : '2';
    }

    // Classe interna -> Q3 ('1' sem cirurgia, '2' com cirurgia/anest/estética, '3' obstetra)
    private mapEspecialidade(classe: RCInternalClass): '1' | '2' | '3' {
        switch (classe) {
            case 'MEDICO_SEM_CIRURGIA': return '1';
            case 'MEDICO_COM_CIRURGIA': return '2';
            case 'OBSTETRA': return '3';
            default: throw new Error(`Classe interna não mapeada: ${classe}`);
        }
    }

    // Valor da cobertura -> Q4 (código Akad)
    private mapCobertura(valor: number): number {
        const tabela = new Map<number, number>([
            [50000, 2],  
            [100000, 4],   
            [150000, 5], 
            [200000, 6],   
            [250000, 7], 
            [300000, 8],   
            [400000, 9],   
            [500000, 10],
        ]);
        const code = tabela.get(Number(valor));
        if (!code) throw new Error(`Cobertura ${valor} não mapeada para a Akad (Q4).`);
        return code;
    }

    // Sinistralidade 5 anos -> Q6
    private mapSinistralidade(s: RcSinistralidade5Anos): '1' | '2' | '3' | '4' {
        switch (s) {
            case 'NENHUM': return '1';
            case 'UM': return '2';
            case 'DOIS': return '3';
            case 'TRES_OU_MAIS': return '4';
        }
    }

    // Reclamações 12m -> Q7
    private mapReclamacoes12m(r: RcReclamacoes12m): '1' | '2' | '3' {
        switch (r) {
            case 'NENHUM': return '1';
            case 'UMA': return '2';
            case 'DUAS_OU_MAIS': return '3';
        }
    }

    // true/false -> '1' / '2'
    private mapSimNao(v: boolean): '1' | '2' {
        return v ? '1' : '2';
    }

    // Retroatividade (anos) -> Q11
    // 0=Sem -> '6', 1..5 -> '1'..'5', 6..10 -> '13'..'17'
    private mapRetroatividade(anos: RcRetroatividadeAnos): string {
        if (anos === 0) return '6';
        if (anos >= 1 && anos <= 5) return String(anos);
        const mapa: Record<number, string> = { 6: '13', 7: '14', 8: '15', 9: '16', 10: '17' };
        const code = mapa[anos];
        if (!code) throw new Error(`Retroatividade ${anos} anos não mapeada (Q11).`);
        return code;
    }

    // Custo de defesa -> Q35
    private mapCustoDefesa(v: RcCustoDefesa): '1' | '2' {
        return v === 'PLUS' ? '2' : '1';
    }

    private toISODate(d: Date): string {
        return new Date(d).toISOString();
    }

    private buildPersonalData(input: RcQuoteInput) {
        // Você disse que enviará dados pessoais estáticos — pode configurar aqui:
        const fixo = input.dadosPessoaisFixos ?? {};
        return {
            Name: fixo.nome ?? 'MEDICO PF API',
            Email: fixo.email ?? 'parcerias-api@akadseguros.com.br',
            Identity: fixo.cpf ?? '00000000191'
        };
    }
}
