import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SupabaseService } from './services/supabase.service';
import { map, switchMap, filter, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return supabase.sessionLoaded$.pipe(
    filter(loaded => loaded === true),
    take(1),
    switchMap(() => supabase.currentUser$),
    take(1),
    map(user => {
      if (user) {
        return true;
      } else {
        console.warn('⚠️ Auth Guard: Negando acesso, redirecionando para login');
        return router.createUrlTree(['/login']);
      }
    })
  );
};