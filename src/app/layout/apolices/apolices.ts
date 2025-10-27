import { Component, OnInit, ViewChild, AfterViewInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, debounceTime, startWith, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';

// Angular Material
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';

import { Firestore, collection, query, orderBy, limit, where, collectionData, Timestamp, doc, deleteDoc } from '@angular/fire/firestore';

// Interface e Conversor (coloque aqui se não estiver em arquivo separado)
interface Apolice {
  id?: string;
  clienteId: string;
  clienteNome: string;
  apolice: string;
  proposta: string;
  seguradora: string;
  produto: string;
  subTipoDocumento: string;
  inicioVigencia: Date | Timestamp | null;
  fimVigencia: Date | Timestamp | null;
  dataEmissao: Date | Timestamp | null;
  tipoSeguro: string;
  situacao: string;
  createdAt?: Date | Timestamp;
  informacoesFinanceiras: {
    formaPagamento: string;
    parcelas: number | null;
    vencimentoPrimeiraParcela: Date | Timestamp | null;
    comissaoPercentual: number | null;
    premioLiquido: number | null;
    iofPercentual: number | null;
    premioTotal: number | null;
  };
  itemSegurado: {
    descricao: string;
  };
}

const apoliceConverter = {
  toFirestore: (apolice: Apolice) => {
    const { id, ...data } = apolice;
    return data;
  },
  fromFirestore: (snapshot: any, options: any) => {
    const data = snapshot.data(options);
    const convertTimestampToDate = (ts: any): Date | null => {
      return ts instanceof Timestamp ? ts.toDate() : (ts instanceof Date ? ts : null);
    };

    return {
      id: snapshot.id,
      ...data,
      inicioVigencia: convertTimestampToDate(data.inicioVigencia),
      fimVigencia: convertTimestampToDate(data.fimVigencia),
      dataEmissao: convertTimestampToDate(data.dataEmissao),
      informacoesFinanceiras: {
        ...data.informacoesFinanceiras,
        vencimentoPrimeiraParcela: convertTimestampToDate(data.informacoesFinanceiras?.vencimentoPrimeiraParcela),
      },
      createdAt: convertTimestampToDate(data.createdAt),
    } as Apolice;
  }
};

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
    MatMenuModule
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
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);
  private convertToDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    console.warn('⚠️ Tipo de data desconhecido:', value);
    return null;
  }

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
    ).subscribe(apolices => {
      // 🎓 EXPLICAÇÃO: Vamos ver quantas apólices foram retornadas
      console.log(`✅ ${apolices.length} apólices recebidas do Firestore`);
      this.dataSource.data = apolices;
      this.apolicesLength = apolices.length;
    });
  }

  getFilteredApolices(filters: any, page: any, sort: any): Observable<Apolice[]> {
    const apolicesCollectionRef = collection(this.firestore, 'apolices').withConverter(apoliceConverter);
  
    // 🎓 EXPLICAÇÃO: Vamos remover os filtros do Firestore e só ordenar
    const queryConstraints = [];
    const activeSortField = sort.active || 'createdAt';
    const sortDirection = sort.direction || 'desc';
    queryConstraints.push(orderBy(activeSortField, sortDirection));
    queryConstraints.push(limit(100));
  
    // 🎓 EXPLICAÇÃO: Removemos os filtros daqui (eram linhas 170-192)
    // Agora vamos filtrar no front, depois de receber os dados
  
    const firestoreQuery = query(apolicesCollectionRef, ...queryConstraints);
  
    return collectionData(firestoreQuery).pipe(
      map(apolices => {
        console.log('📊 Apólices do Firestore:', apolices);
        console.log('🔍 Filtros aplicados:', filters);
        
        let filteredData = apolices;
  
        // 🎓 EXPLICAÇÃO: AGORA fazemos os filtros aqui no front
        if (filters.tipoSeguro) {
          const searchTerm = filters.tipoSeguro.toLowerCase().trim();
          filteredData = filteredData.filter(apolice =>
            apolice.tipoSeguro?.toLowerCase().trim() === searchTerm
          );
          console.log(`🔎 Filtrou por tipoSeguro '${filters.tipoSeguro}': ${filteredData.length} restantes`);
        }
  
        if (filters.seguradora) {
          const searchTerm = filters.seguradora.toLowerCase().trim();
          filteredData = filteredData.filter(apolice =>
            apolice.seguradora?.toLowerCase().trim() === searchTerm
          );
          console.log(`🔎 Filtrou por seguradora '${filters.seguradora}': ${filteredData.length} restantes`);
        }
  
        if (filters.produto) {
          const searchTerm = filters.produto.toLowerCase().trim();
          filteredData = filteredData.filter(apolice =>
            apolice.produto?.toLowerCase().trim() === searchTerm
          );
          console.log(`🔎 Filtrou por produto '${filters.produto}': ${filteredData.length} restantes`);
        }
  
        if (filters.situacao) {
          const searchTerm = filters.situacao.toLowerCase().trim();
          filteredData = filteredData.filter(apolice =>
            apolice.situacao?.toLowerCase().trim() === searchTerm
          );
          console.log(`🔎 Filtrou por situação '${filters.situacao}': ${filteredData.length} restantes`);
        }
  
        // 🎓 EXPLICAÇÃO: Filtros de data
        if (filters.dataEmissaoStart && filters.dataEmissaoEnd) {
          filteredData = filteredData.filter(apolice => {
            if (!apolice.dataEmissao) return false;
            const dataEmissao = this.convertToDate(apolice.dataEmissao);
            if(!dataEmissao) return false;
            return dataEmissao >= filters.dataEmissaoStart && 
                   dataEmissao <= filters.dataEmissaoEnd;
          });
          console.log(`🔎 Filtrou por data emissão: ${filteredData.length} restantes`);
        }
  
        if (filters.inicioVigenciaStart && filters.inicioVigenciaEnd) {
          filteredData = filteredData.filter(apolice => {
            if (!apolice.inicioVigencia) return false;
            const inicioVigencia = this.convertToDate(apolice.inicioVigencia);
            if(!inicioVigencia) return false;
            return inicioVigencia >= filters.inicioVigenciaStart && 
                   inicioVigencia <= filters.inicioVigenciaEnd;
          });
          console.log(`🔎 Filtrou por início vigência: ${filteredData.length} restantes`);
        }
  
        if (filters.searchText) {
          const searchTerm = filters.searchText.toLowerCase();
          filteredData = filteredData.filter(apolice =>
            apolice.apolice.toLowerCase().includes(searchTerm) ||
            apolice.clienteNome.toLowerCase().includes(searchTerm) ||
            apolice.seguradora.toLowerCase().includes(searchTerm) ||
            apolice.produto.toLowerCase().includes(searchTerm) ||
            (apolice.subTipoDocumento && apolice.subTipoDocumento.toLowerCase().includes(searchTerm)) ||
            (apolice.proposta && apolice.proposta.toLowerCase().includes(searchTerm))
          );
          console.log(`🔎 Filtrou por busca geral '${filters.searchText}': ${filteredData.length} restantes`);
        }
  
        console.log(`✅ ${filteredData.length} apólices após TODOS os filtros`);
        return filteredData;
      })
    );
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
        await deleteDoc(doc(this.firestore, `apolices/${id}`));
        console.log('Apólice excluída com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir apólice:', error);
      }
    }
  }
}
