import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { Observable, firstValueFrom, of } from 'rxjs';
import { CarrierId, EspecialidadeInfo, RCInternalClass } from '../models/respCivil.model';

@Injectable({ providedIn: 'root' })
export class RCMultiService {
    private http = inject(HttpClient);

    // 1) Carrega seu JSON 1x e guarda em memória (shareReplay)
    //    Ajuste o caminho do arquivo conforme onde você salvou.
    private especialidades$ = this.http.get<any>('/enquandramentos.json').pipe(
        map((raw) => this.normalizeRaw(raw)),
        shareReplay(1),
        catchError(err => { console.error('Falha ao carregar /enquadramento.json', err); return of([] as EspecialidadeInfo[]); })
      );

    // 2) Índices auxiliares (nome -> classe, id -> classe), para busca rápida
    //    (cada função explica na legenda abaixo)
    getEspecialidades(): Observable<EspecialidadeInfo[]> {
        return this.especialidades$;
    }

    async getClasseByEspecialidadeId(id: string): Promise<RCInternalClass | null> {
        const list = await firstValueFrom(this.especialidades$);
        const hit = list?.find(x => x.id === id);
        return hit?.classe ?? null;
    }

    async getClasseByNome(nome: string): Promise<RCInternalClass | null> {
        const list = await firstValueFrom(this.especialidades$);
        const hit = list?.find(x => x.nome.toLowerCase() === nome.toLowerCase());
        return hit?.classe ?? null;
    }

    async resolveClasse(especialidadeIdOuNome: string): Promise<RCInternalClass | null> {
        const list = await firstValueFrom(this.especialidades$);
        const alvo = (especialidadeIdOuNome ?? '').trim().toLowerCase();
        if (!alvo) return null;
    
        // tenta bater pelo id (slug)
        let hit = list.find(x => x.id === alvo);
        if (!hit) {
          // tenta bater pelo nome normalizado
          hit = list.find(x => this.norm(x.nome) === this.norm(alvo));
        }
        return hit?.classe ?? null;
      }
    
      // ---------- helpers ----------
    
      private normalizeRaw(raw: any): EspecialidadeInfo[] {
        // Formato A: array
        if (Array.isArray(raw)) {
          // esperamos algo como [{ id, nome, enquadramento }, ...]
          return raw.map((r: any) => ({
            id: (r.id ?? this.slug(r.nome ?? '')).toLowerCase(),
            nome: String(r.nome ?? ''),
            classe: this.normalizeClasse(String(r.enquadramento ?? ''))
          }));
        }
    
        // Formato B: objeto { nome: classe, ... }
        if (raw && typeof raw === 'object') {
          return Object.entries(raw).map(([nome, classe]) => ({
            id: this.slug(nome),
            nome,
            classe: this.normalizeClasse(String(classe))
          }));
        }
    
        // Qualquer outra coisa: vazio
        return [];
      }
    
      private normalizeClasse(v: string): RCInternalClass {
        const k = v.trim().toUpperCase();
        // aceita seus 4 valores possíveis
        if (k === 'MEDICO_SEM_CIRURGIA') return 'MEDICO_SEM_CIRURGIA';
        if (k === 'MEDICO_COM_CIRURGIA') return 'MEDICO_COM_CIRURGIA';
        if (k === 'OBSTETRA')            return 'OBSTETRA';
        if (k === 'CIRURGIAO_PLASTICO')  return 'CIRURGIAO_PLASTICO';
        // fallback seguro (ajuste se quiser tratar como erro)
        return 'MEDICO_SEM_CIRURGIA';
      }
    
      private slug(s: string): string {
        return String(s)
          .normalize('NFD').replace(/\p{Diacritic}/gu, '') // tira acentos
          .toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }
    
      private norm(s: string): string {
        return String(s)
          .normalize('NFD')
          // remove acentos
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .trim();
      }

    // 3) Tabela de tradução: classe interna -> código de cada seguradora
    //    null = não suportado pela seguradora.
    private carrierMap: Record<CarrierId, Partial<Record<RCInternalClass, string | null>>> = {
        FF: {
            MEDICO_SEM_CIRURGIA: 'NO-SURGERY',
            MEDICO_COM_CIRURGIA: 'SURGERY-EXCEPT-PLASTIC',
            OBSTETRA: 'OBSTETRICIAN',
            CIRURGIAO_PLASTICO: 'PLASTIC-SURGEON' // coloque 'PLASTIC-SURGEON' se a Fairfax tiver código oficial
        },
        Akad: {
            MEDICO_SEM_CIRURGIA: '1',
            MEDICO_COM_CIRURGIA: '2', // “exceto plástico”
            OBSTETRA: '3',
            CIRURGIAO_PLASTICO: null // não suportado pela descrição da Akad
        }
    };

    mapClasseToCarrierCode(
      carrier: CarrierId,
      classe: RCInternalClass
    ): string | null {
      return this.carrierMap?.[carrier]?.[classe] ?? null;
    }


    // 4) Pega a "classe da seguradora" a partir da classe interna
    mapToCarrierClass(carrier: CarrierId, classe: RCInternalClass): string | null {
        return this.carrierMap[carrier]?.[classe] ?? null;
    }

    // 5) Dado o nome/id da especialidade, devolve quais seguradoras aceitam
    async supportedCarriersForEspecialidade(especialidadeId: string): Promise<{ carrier: CarrierId; classCode: string }[]> {
        const classe = await this.getClasseByEspecialidadeId(especialidadeId);
        if (!classe) return [];
        const entries: CarrierId[] = ['FF', 'Akad'];
        return entries
            .map(c => ({ carrier: c, classCode: this.mapToCarrierClass(c, classe) }))
            .filter(x => !!x.classCode) as any;
    }
}
