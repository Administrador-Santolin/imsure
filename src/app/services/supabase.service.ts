import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { supabaseConfig } from '../supabase-config';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  // 🎓 EXPLICAÇÃO: Agora usamos BehaviorSubject com valor inicial FALSE
  private sessionLoadedSubject = new BehaviorSubject<boolean>(false);
  public sessionLoaded$ = this.sessionLoadedSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      supabaseConfig.supabaseUrl,
      supabaseConfig.supabaseKey
    );

    // 🎓 EXPLICAÇÃO: Inicializa a sessão
    this.initializeSession();

    // 🎓 EXPLICAÇÃO: Escuta mudanças no estado de autenticação
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, new Date().toLocaleTimeString());
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  // 🎓 EXPLICAÇÃO: Método para inicializar e recuperar a sessão salva
  private async initializeSession() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      this.currentUserSubject.next(session?.user ?? null);
    } catch (error) {
      this.currentUserSubject.next(null);
    } finally {
      // 🎓 EXPLICAÇÃO: Agora emite TRUE para sinalizar que terminou
      this.sessionLoadedSubject.next(true);
    }
  }

  get client() {
    return this.supabase;
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined
      }
    });
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    const result = await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    return result;
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // 🎓 NOVO: Método helper que retorna uma Promise que resolve quando a sessão carregar
  async waitForSessionLoad(): Promise<void> {
    await firstValueFrom(
      this.sessionLoaded$.pipe(
        filter(loaded => loaded === true),
        take(1)
      )
    );
  }
}