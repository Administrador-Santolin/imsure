import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Seguradora, SeguradoraCreate, SeguradoraUpdate } from '../models/seguradora.model';

@Injectable({
  providedIn: 'root'
})
export class SeguradoraService {
  private supabase = inject(SupabaseService);

  // ========================================
  // BUSCAR TODAS AS SEGURADORAS
  // ========================================
  getSeguradoras(): Observable<Seguradora[]> {
    return from(
      this.supabase.client
        .from('seguradoras')
        .select('*')
        .order('nome', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar seguradoras:', response.error);
          throw response.error;
        }
        return (response.data || []).map(this.mapFromSupabase);
      })
    );
  }

  // ========================================
  // BUSCAR SEGURADORA POR ID
  // ========================================
  getSeguradoraById(id: string): Observable<Seguradora | null> {
    return from(
      this.supabase.client
        .from('seguradoras')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar seguradora:', response.error);
          throw response.error;
        }
        return response.data ? this.mapFromSupabase(response.data) : null;
      })
    );
  }

  // ========================================
  // BUSCAR SEGURADORAS ATIVAS
  // ========================================
  getSeguradorasAtivas(): Observable<Seguradora[]> {
    return from(
      this.supabase.client
        .from('seguradoras')
        .select('*')
        .eq('ativa', true)
        .order('nome', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar seguradoras ativas:', response.error);
          throw response.error;
        }
        return (response.data || []).map(this.mapFromSupabase);
      })
    );
  }

  // ========================================
  // CRIAR SEGURADORA
  // ========================================
  async createSeguradora(seguradora: SeguradoraCreate): Promise<Seguradora> {
    const dataToInsert = this.mapToSupabase(seguradora);

    const { data, error } = await this.supabase.client
      .from('seguradoras')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar seguradora:', error);
      throw error;
    }

    return this.mapFromSupabase(data);
  }

  // ========================================
  // ATUALIZAR SEGURADORA
  // ========================================
  async updateSeguradora(id: string, seguradora: SeguradoraUpdate): Promise<Seguradora> {
    const dataToUpdate = this.mapToSupabase(seguradora);

    const { data, error } = await this.supabase.client
      .from('seguradoras')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar seguradora:', error);
      throw error;
    }

    return this.mapFromSupabase(data);
  }

  // ========================================
  // DELETAR SEGURADORA
  // ========================================
  async deleteSeguradora(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('seguradoras')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar seguradora:', error);
      throw error;
    }
  }

  // ========================================
  // MAPEAMENTO DE DADOS
  // ========================================
  
  // 🎓 EXPLICAÇÃO: Converte snake_case (Supabase) para camelCase (TypeScript)
  private mapFromSupabase(data: any): Seguradora {
    return {
      id: data.id,
      nome: data.nome,
      cnpj: data.cnpj,
      contatoComercial: data.contato_comercial,
      telefone: data.telefone,
      email: data.email,
      ativa: data.ativa,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }

  // 🎓 EXPLICAÇÃO: Converte camelCase (TypeScript) para snake_case (Supabase)
  private mapToSupabase(seguradora: Partial<Seguradora>): any {
    const data: any = {};

    if (seguradora.nome !== undefined) data.nome = seguradora.nome;
    if (seguradora.cnpj !== undefined) data.cnpj = seguradora.cnpj;
    if (seguradora.contatoComercial !== undefined) data.contato_comercial = seguradora.contatoComercial;
    if (seguradora.telefone !== undefined) data.telefone = seguradora.telefone;
    if (seguradora.email !== undefined) data.email = seguradora.email;
    if (seguradora.ativa !== undefined) data.ativa = seguradora.ativa;

    return data;
  }
}