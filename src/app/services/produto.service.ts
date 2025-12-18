import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Produto, ProdutoCreate, ProdutoUpdate } from '../models/produto.model';

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {
  private supabase = inject(SupabaseService);

  // ========================================
  // BUSCAR TODOS OS PRODUTOS
  // ========================================
  getProdutos(): Observable<Produto[]> {
    return from(
      this.supabase.client
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar produtos:', response.error);
          throw response.error;
        }
        return (response.data || []).map(this.mapFromSupabase);
      })
    );
  }

  // ========================================
  // BUSCAR PRODUTO POR ID
  // ========================================
  getProdutoById(id: string): Observable<Produto | null> {
    return from(
      this.supabase.client
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar produto:', response.error);
          throw response.error;
        }
        return response.data ? this.mapFromSupabase(response.data) : null;
      })
    );
  }

  // ========================================
  // BUSCAR PRODUTOS ATIVOS
  // ========================================
  getProdutosAtivos(): Observable<Produto[]> {
    return from(
      this.supabase.client
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar produtos ativos:', response.error);
          throw response.error;
        }
        return (response.data || []).map(this.mapFromSupabase);
      })
    );
  }

  // ========================================
  // BUSCAR PRODUTOS POR SEGURADORA
  // ========================================
  // 🎓 EXPLICAÇÃO: Retorna apenas produtos que a seguradora oferece
  getProdutosPorSeguradora(seguradoraId: string): Observable<Produto[]> {
    return from(
      this.supabase.client
        .from('seguradora_produtos')
        .select(`
          produto_id,
          produtos (*)
        `)
        .eq('seguradora_id', seguradoraId)
        .eq('ativo', true)
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar produtos da seguradora:', response.error);
          throw response.error;
        }
        // 🎓 EXPLICAÇÃO: Extrai os produtos da resposta aninhada
        return (response.data || [])
          .map((item: any) => item.produtos)
          .filter((produto: any) => produto !== null)
          .map(this.mapFromSupabase);
      })
    );
  }

  // ========================================
  // CRIAR PRODUTO
  // ========================================
  async createProduto(produto: ProdutoCreate): Promise<Produto> {
    const dataToInsert = this.mapToSupabase(produto);

    const { data, error } = await this.supabase.client
      .from('produtos')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }

    return this.mapFromSupabase(data);
  }

  // ========================================
  // ATUALIZAR PRODUTO
  // ========================================
  async updateProduto(id: string, produto: ProdutoUpdate): Promise<Produto> {
    const dataToUpdate = this.mapToSupabase(produto);

    const { data, error } = await this.supabase.client
      .from('produtos')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }

    return this.mapFromSupabase(data);
  }

  // ========================================
  // DELETAR PRODUTO
  // ========================================
  async deleteProduto(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }

  // ========================================
  // VINCULAR PRODUTO À SEGURADORA
  // ========================================
  async vincularProdutoSeguradora(seguradoraId: string, produtoId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('seguradora_produtos')
      .insert([{
        seguradora_id: seguradoraId,
        produto_id: produtoId,
        ativo: true
      }]);

    if (error) {
      console.error('Erro ao vincular produto:', error);
      throw error;
    }
  }

  // ========================================
  // DESVINCULAR PRODUTO DA SEGURADORA
  // ========================================
  async desvincularProdutoSeguradora(seguradoraId: string, produtoId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('seguradora_produtos')
      .delete()
      .eq('seguradora_id', seguradoraId)
      .eq('produto_id', produtoId);

    if (error) {
      console.error('Erro ao desvincular produto:', error);
      throw error;
    }
  }

  // ========================================
  // MAPEAMENTO DE DADOS
  // ========================================
  
  private mapFromSupabase(data: any): Produto {
    return {
      id: data.id,
      nome: data.nome,
      tipoSeguro: data.tipo_seguro,
      descricao: data.descricao,
      ativo: data.ativo,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }

  private mapToSupabase(produto: Partial<Produto>): any {
    const data: any = {};

    if (produto.nome !== undefined) data.nome = produto.nome;
    if (produto.tipoSeguro !== undefined) data.tipo_seguro = produto.tipoSeguro;
    if (produto.descricao !== undefined) data.descricao = produto.descricao;
    if (produto.ativo !== undefined) data.ativo = produto.ativo;

    return data;
  }
}