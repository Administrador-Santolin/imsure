import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, debounceTime, startWith, switchMap } from 'rxjs';

// Angular Material
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { Apolice } from '../../models/apolice.model';
import { ApoliceService } from '../../services/apolice.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-apolices',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    RouterModule,
    MatMenuModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './apolices.html',
  styleUrl: './apolices.scss'
})
export class Apolices implements OnInit, AfterViewInit {
  filterForm: FormGroup;
  displayedColumns: string[] = ['apolice', 'clienteNome', 'seguradora', 'produto', 'dataEmissao', 'situacao', 'acoes'];
  dataSource = new MatTableDataSource<Apolice>();
  apolicesLength = 0;

  tipoSeguroOptions = ['Automóvel', 'Vida', 'Residencial', 'Empresarial', 'Saúde'];
  seguradoraOptions = ['Porto Seguro', 'SulAmérica', 'Bradesco Seguros', 'Mapfre', 'Outra'];
  produtoOptions = ['Auto Clássico', 'Vida Total', 'Residência Premium', 'Empresarial Completo'];
  situacaoOptions = ['Ativa', 'Cancelada', 'Vencida', 'Em Análise', 'Pendente'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private router = inject(Router);
  private apoliceService = inject(ApoliceService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  constructor(
  ) {
    this.filterForm = this.fb.group({
      tipoSeguro: [''],
      seguradora: [''],
      produto: [''],
      inicioVigenciaStart: [null],
      inicioVigenciaEnd: [null],
      dataEmissaoStart: [null],
      dataEmissaoEnd: [null],
      situacao: [''],
      searchText: ['']
    });

    this.filterForm.valueChanges.subscribe(values => {
      console.log('📝 Formulário mudou:', values);
    });
  }

  ngOnInit(): void {
    // ngOnInit pode ser usado para inicialização do formulário ou outras coisas que NÃO dependem das ViewChilds.
    // A lógica que depende de `this.paginator` e `this.sort` deve ir para ngAfterViewInit.
  }

  ngAfterViewInit(): void {
    // Agora `this.paginator` e `this.sort` estão garantidos a serem inicializados
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // 🎓 EXPLICAÇÃO: Vamos ver se o valueChanges está disparando
    console.log('🚀 ngAfterViewInit iniciado');

    // Mova a lógica do combineLatest para cá
    combineLatest([
      this.filterForm.valueChanges.pipe(startWith(this.filterForm.value)),
      this.paginator.page.pipe(startWith({ pageIndex: 0, pageSize: 20, length: 0 })),
      this.sort.sortChange.pipe(startWith({ active: 'createdAt', direction: 'desc' }))
    ]).pipe(
      debounceTime(300),
      switchMap(([filters, page, sort]) => {
        // 🎓 EXPLICAÇÃO: Vamos ver se chegou aqui e quais filtros foram aplicados
        console.log('🔍 Filtros recebidos no switchMap:', filters);
        console.log('📄 Página:', page);
        console.log('🔤 Ordenação:', sort);
        return this.getFilteredApolices(filters, page, sort);
      })
    ).subscribe({
      next: (apolices) => {
        console.log(`✅ ${apolices.length} apólices recebidas do Supabase`);
        this.dataSource.data = apolices;
        this.apolicesLength = apolices.length;
      },
      error: (error) => {
        console.error('Erro ao carregar apólices:', error);
        this.snackBar.open('Erro ao carregar apólices', 'Fechar', { duration: 3000 });
      }
    });
  }

  applyFilter(field: string, value: string): void {
    this.filterForm.patchValue({ [field]: value }, { emitEvent: true });
  }

  clearDateFilter(type: 'dataEmissao' | 'vigencia'): void {
    if (type === 'dataEmissao') {
      this.filterForm.patchValue({
        dataEmissaoStart: null,
        dataEmissaoEnd: null
      });
    } else {
      this.filterForm.patchValue({
        inicioVigenciaStart: null,
        inicioVigenciaEnd: null
      })
    }
  }

  hasActiveFilters(): boolean {
    const formValue = this.filterForm.value;
    return !!(
      formValue.situacao ||
      formValue.seguradora ||
      formValue.tipoSeguro ||
      formValue.produto ||
      formValue.dataEmissaoStart ||
      formValue.dataEmissaoEnd ||
      formValue.inicioVigenciaStart ||
      formValue.inicioVigenciaEnd ||
      formValue.searchText
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    const formValue = this.filterForm.value;
    if (formValue.situacao) count++;
    if (formValue.seguradora) count++;
    if (formValue.tipoSeguro) count++;
    if (formValue.produto) count++;
    if (formValue.dataEmissaoStart || formValue.dataEmissaoEnd) count++;
    if (formValue.inicioVigenciaStart || formValue.inicioVigenciaEnd) count++;
    if (formValue.searchText) count++;
    return count;
  }

  getFilteredApolices(filters: any, page: any, sort: any): Observable<Apolice[]> {
    // 🎓 EXPLICAÇÃO: O serviço já aplica os filtros no Supabase (server-side)
    return this.apoliceService.getApolices(filters, sort);
  }

  clearFilters(): void {
    this.filterForm.reset({
      tipoSeguro: '',
      seguradora: '',
      produto: '',
      inicioVigenciaStart: null,
      inicioVigenciaEnd: null,
      dataEmissaoStart: null,
      dataEmissaoEnd: null,
      situacao: '',
      searchText: ''
    });
  }

  editApolice(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/apolices', id]);
    } else {
      console.warn('Não é possível editar a apólice: ID não definido.');
    }
  }

  async deleteApolice(id: string | undefined): Promise<void> {
    if (id && confirm('Tem certeza que deseja excluir esta apólice?')) {
      try {
        await this.apoliceService.deleteApolice(id);
        this.snackBar.open('Apólice excluída com sucesso!', 'Fechar', { duration: 3000 });
        // Recarrega os dados
        this.filterForm.patchValue(this.filterForm.value);
      } catch (error) {
        console.error('Erro ao excluir apólice:', error);
        this.snackBar.open('Erro ao excluir apólice', 'Fechar', { duration: 3000 });
      }
    }
  }
}
