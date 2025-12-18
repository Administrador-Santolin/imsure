import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { Cliente, ClienteCreate, ClienteUpdate } from '../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private supabase = inject(SupabaseService);

  // ========================================
  // BUSCAR TODOS OS CLIENTES
  // ========================================
  // 🎓 EXPLICAÇÃO: Retorna Observable para manter compatibilidade com código existente
  getClientes(): Observable<Cliente[]> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar clientes:', response.error);
          throw response.error;
        }
        return response.data || [];
      })
    );
  }

  // ========================================
  // BUSCAR CLIENTE POR ID
  // ========================================
  getClienteById(id: string): Observable<Cliente | null> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single() // 🎓 EXPLICAÇÃO: single() retorna um único objeto ao invés de array
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar cliente:', response.error);
          throw response.error;
        }
        return response.data;
      })
    );
  }

  // ========================================
  // BUSCAR CLIENTES (AUTOCOMPLETE/SEARCH)
  // ========================================
  // 🎓 EXPLICAÇÃO: Busca por nome OU cpf (usando ILIKE para case-insensitive)
  searchClientes(searchText: string): Observable<Cliente[]> {
    if (!searchText || searchText.length < 2) {
      return from(Promise.resolve([]));
    }

    const searchTerm = `%${searchText}%`;

    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .or(`nome.ilike.${searchTerm},cpf.ilike.${searchTerm}`)
        .limit(10)
        .order('nome', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          console.error('Erro ao buscar clientes:', response.error);
          throw response.error;
        }
        return response.data || [];
      })
    );
  }

  // ========================================
  // CRIAR NOVO CLIENTE
  // ========================================
  async createCliente(cliente: ClienteCreate): Promise<Cliente> {
    const { data, error } = await this.supabase.client
      .from('clientes')
      .insert([{
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        cpf: cliente.cpf,
        genero: cliente.genero,
        dataNascimento: cliente.dataNascimento,
        estadoCivil: cliente.estadoCivil,
        endereco: cliente.endereco // 🎓 EXPLICAÇÃO: JSONB aceita objetos diretamente
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }

    return data;
  }

  // ========================================
  // ATUALIZAR CLIENTE
  // ========================================
  async updateCliente(id: string, cliente: ClienteUpdate): Promise<Cliente> {
    const updateData: any = {};

    // 🎓 EXPLICAÇÃO: Só adiciona campos que foram fornecidos
    if (cliente.nome) updateData.nome = cliente.nome;
    if (cliente.email) updateData.email = cliente.email;
    if (cliente.telefone) updateData.telefone = cliente.telefone;
    if (cliente.cpf) updateData.cpf = cliente.cpf;
    if (cliente.genero) updateData.genero = cliente.genero;
    if (cliente.dataNascimento) updateData.dataNascimento = cliente.dataNascimento;
    if (cliente.estadoCivil) updateData.estadoCivil = cliente.estadoCivil;
    if (cliente.endereco) updateData.endereco = cliente.endereco;

    const { data, error } = await this.supabase.client
      .from('clientes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }

    return data;
  }

  // ========================================
  // DELETAR CLIENTE
  // ========================================
  async deleteCliente(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar cliente:', error);
      throw error;
    }
  }

  // ========================================
  // OBSERVAR MUDANÇAS EM TEMPO REAL (OPCIONAL)
  // ========================================
  // 🎓 EXPLICAÇÃO: Supabase tem realtime! Similar ao Firestore
  watchClientes(): Observable<Cliente[]> {
    return new Observable(subscriber => {
      // Carrega dados iniciais
      this.getClientes().subscribe(clientes => {
        subscriber.next(clientes);
      });

      // Inscreve para mudanças em tempo real
      const subscription = this.supabase.client
        .channel('clientes-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'clientes' },
          () => {
            // Quando houver mudança, recarrega os dados
            this.getClientes().subscribe(clientes => {
              subscriber.next(clientes);
            });
          }
        )
        .subscribe();

      // Cleanup quando desinscrever
      return () => {
        subscription.unsubscribe();
      };
    });
  }
}