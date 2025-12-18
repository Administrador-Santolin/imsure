import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Apolice } from '../models/apolice.model';

@Injectable({
  providedIn: 'root'
})
export class ApoliceService {
  private supabase = inject(SupabaseService);

  // ========================================
  // BUSCAR TODAS AS APÓLICES COM FILTROS
  // ========================================
  getApolices(filters?: {
    seguradora?: string;
    situacao?: string;
    tipoSeguro?: string;
    produto?: string;
    dataEmissaoStart?: Date;
    dataEmissaoEnd?: Date;
    inicioVigenciaStart?: Date;
    inicioVigenciaEnd?: Date;
    searchText?: string;
  }, sort?: { active: string; direction: 'asc' | 'desc' }): Observable<Apolice[]> {
    let query = this.supabase.client
      .from('apolices')
      .select('*');

    // Aplicar filtros no Supabase
    if (filters?.seguradora) {
      query = query.eq('seguradora', filters.seguradora);
    }

    if (filters?.situacao) {
      query = query.eq('situacao', filters.situacao);
    }

    if (filters?.tipoSeguro) {
      query = query.eq('tipo_seguro', filters.tipoSeguro);
    }

    if (filters?.produto) {
      query = query.eq('produto', filters.produto);
    }

    // Filtros de data
    if (filters?.dataEmissaoStart) {
      query = query.gte('data_emissao', filters.dataEmissaoStart.toISOString().split('T')[0]);
    }

    if (filters?.dataEmissaoEnd) {
      query = query.lte('data_emissao', filters.dataEmissaoEnd.toISOString().split('T')[0]);
    }

    if (filters?.inicioVigenciaStart) {
      query = query.gte('inicio_vigencia', filters.inicioVigenciaStart.toISOString().split('T')[0]);
    }

    if (filters?.inicioVigenciaEnd) {
      query = query.lte('inicio_vigencia', filters.inicioVigenciaEnd.toISOString().split('T')[0]);
    }

    // Ordenação
    // 🎓 EXPLICAÇÃO: Mapeia campos do frontend para campos do Supabase
    const sortFieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'dataEmissao': 'data_emissao',
      'inicioVigencia': 'inicio_vigencia',
      'clienteNome': 'cliente_nome'
    };
    const sortField = sortFieldMap[sort?.active || ''] || sort?.active || 'created_at';
    const sortDirection = sort?.direction || 'desc';
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // Limite (pode ser ajustado conforme necessário)
    query = query.limit(1000);

    return from(query).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar apólices:', response.error);
          throw response.error;
        }

        let apolices = (response.data || []).map(this.mapFromSupabase);

        // Filtro de busca de texto no frontend (Supabase não tem busca full-text simples)
        if (filters?.searchText) {
          const searchTerm = filters.searchText.toLowerCase();
          apolices = apolices.filter(ap =>
            ap.apolice?.toLowerCase().includes(searchTerm) ||
            ap.clienteNome?.toLowerCase().includes(searchTerm) ||
            ap.seguradora?.toLowerCase().includes(searchTerm) ||
            ap.produto?.toLowerCase().includes(searchTerm) ||
            (ap.subTipoDocumento && ap.subTipoDocumento.toLowerCase().includes(searchTerm)) ||
            (ap.proposta && ap.proposta.toLowerCase().includes(searchTerm))
          );
        }

        return apolices;
      })
    );
  }

  // ========================================
  // BUSCAR APÓLICE POR ID
  // ========================================
  getApoliceById(id: string): Observable<Apolice | null> {
    return from(
      this.supabase.client
        .from('apolices')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar apólice:', response.error);
          throw response.error;
        }
        return response.data ? this.mapFromSupabase(response.data) : null;
      })
    );
  }

  // ========================================
  // CRIAR NOVA APÓLICE
  // ========================================
  async createApolice(apolice: Omit<Apolice, 'id' | 'createdAt'>): Promise<Apolice> {
    const dataToInsert = this.mapToSupabase(apolice);

    const { data, error } = await this.supabase.client
      .from('apolices')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar apólice:', error);
      throw error;
    }

    return this.mapFromSupabase(data);
  }

  // ========================================
  // ATUALIZAR APÓLICE
  // ========================================
  async updateApolice(id: string, apolice: Partial<Apolice>): Promise<Apolice> {
    const dataToUpdate = this.mapToSupabase(apolice as Apolice, true);

    const { data, error } = await this.supabase.client
      .from('apolices')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar apólice:', error);
      throw error;
    }

    return this.mapFromSupabase(data);
  }

  // ========================================
  // DELETAR APÓLICE
  // ========================================
  async deleteApolice(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('apolices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar apólice:', error);
      throw error;
    }
  }

  // ========================================
  // MAPEAMENTO DE DADOS
  // ========================================
  
  // 🎓 EXPLICAÇÃO: Converte dados do Supabase para o formato da interface Apolice
  private mapFromSupabase(data: any): Apolice {
    return {
      id: data.id,
      clienteId: data.cliente_id,
      clienteNome: data.cliente_nome,
      apolice: data.apolice,
      proposta: data.proposta,
      seguradora: data.seguradora,
      produto: data.produto,
      subTipoDocumento: data.sub_tipo_documento,
      inicioVigencia: data.inicio_vigencia ? new Date(data.inicio_vigencia) : null,
      fimVigencia: data.fim_vigencia ? new Date(data.fim_vigencia) : null,
      dataEmissao: data.data_emissao ? new Date(data.data_emissao) : null,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      tipoSeguro: data.tipo_seguro,
      situacao: data.situacao,
      formaPagamento: data.forma_pagamento ? {
        formaPagamento: data.forma_pagamento.forma_pagamento || data.forma_pagamento.formaPagamento,
        parcelas: data.forma_pagamento.parcelas,
        vencimentoPrimeiraParcela: data.forma_pagamento.vencimento_primeira_parcela 
          ? new Date(data.forma_pagamento.vencimento_primeira_parcela)
          : (data.forma_pagamento.vencimentoPrimeiraParcela ? new Date(data.forma_pagamento.vencimentoPrimeiraParcela) : null),
        comissaoPercentual: data.forma_pagamento.comissao_percentual || data.forma_pagamento.comissaoPercentual,
        premioLiquido: data.forma_pagamento.premio_liquido || data.forma_pagamento.premioLiquido,
        iofPercentual: data.forma_pagamento.iof_percentual || data.forma_pagamento.iofPercentual,
        premioTotal: data.forma_pagamento.premio_total || data.forma_pagamento.premioTotal
      } : {},
      itensSegurados: data.itens_segurados || data.itensSegurados || []
    } as Apolice;
  }

  // 🎓 EXPLICAÇÃO: Converte dados da interface Apolice para o formato do Supabase
  private mapToSupabase(apolice: Apolice, isUpdate: boolean = false): any {
    const data: any = {};

    if (!isUpdate || apolice.clienteId !== undefined) data.cliente_id = apolice.clienteId;
    if (!isUpdate || apolice.clienteNome !== undefined) data.cliente_nome = apolice.clienteNome;
    if (!isUpdate || apolice.apolice !== undefined) data.apolice = apolice.apolice;
    if (!isUpdate || apolice.proposta !== undefined) data.proposta = apolice.proposta;
    if (!isUpdate || apolice.seguradora !== undefined) data.seguradora = apolice.seguradora;
    if (!isUpdate || apolice.produto !== undefined) data.produto = apolice.produto;
    if (!isUpdate || apolice.subTipoDocumento !== undefined) data.sub_tipo_documento = apolice.subTipoDocumento;
    if (!isUpdate || apolice.tipoSeguro !== undefined) data.tipo_seguro = apolice.tipoSeguro;
    if (!isUpdate || apolice.situacao !== undefined) data.situacao = apolice.situacao;
    if (!isUpdate || apolice.formaPagamento !== undefined) data.forma_pagamento = apolice.formaPagamento;
    if (!isUpdate || apolice.itensSegurados !== undefined) data.itens_segurados = apolice.itensSegurados;

    // Conversão de datas
    if (apolice.inicioVigencia) {
      data.inicio_vigencia = apolice.inicioVigencia instanceof Date 
        ? apolice.inicioVigencia.toISOString() 
        : new Date(apolice.inicioVigencia).toISOString();
    }

    if (apolice.fimVigencia) {
      data.fim_vigencia = apolice.fimVigencia instanceof Date 
        ? apolice.fimVigencia.toISOString() 
        : new Date(apolice.fimVigencia).toISOString();
    }

    if (apolice.dataEmissao) {
      data.data_emissao = apolice.dataEmissao instanceof Date 
        ? apolice.dataEmissao.toISOString() 
        : new Date(apolice.dataEmissao).toISOString();
    }

    if (apolice.formaPagamento) {
      data.forma_pagamento = {
        forma_pagamento: apolice.formaPagamento.formaPagamento,
        parcelas: apolice.formaPagamento.parcelas,
        vencimento_primeira_parcela: apolice.formaPagamento.vencimentoPrimeiraParcela 
          ? (apolice.formaPagamento.vencimentoPrimeiraParcela instanceof Date 
            ? apolice.formaPagamento.vencimentoPrimeiraParcela.toISOString() 
            : new Date(apolice.formaPagamento.vencimentoPrimeiraParcela).toISOString())
          : null,
        comissao_percentual: apolice.formaPagamento.comissaoPercentual,
        premio_liquido: apolice.formaPagamento.premioLiquido,
        iof_percentual: apolice.formaPagamento.iofPercentual,
        premio_total: apolice.formaPagamento.premioTotal
      };
    }

    return data;
  }
}

