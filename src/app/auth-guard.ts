import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe( // `currentUser` é um Observable que emite o usuário logado (ou null)
    take(1),
    map(user => {
      if (user) {
        // Se houver um usuário logado, permite o acesso à rota
        return true;
      } else {
        // Se não houver usuário logado, redireciona para a página de login
        console.warn('Acesso negado: Usuário não autenticado. Redirecionando para login.');
        return router.createUrlTree(['/login']); // Cria uma URL de redirecionamento
      }
    })
  );
};
