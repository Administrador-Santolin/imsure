import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, map, Observable, startWith, switchMap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { Cliente } from '../../../models/cliente.model';
import { MascaraPipe } from '../../../mascara-pipe';
import { NgxMaskDirective } from 'ngx-mask';
import { Automovel } from './Produtos/automovel/automovel';
import { Locais } from './Produtos/locais/locais';
import { RespCivil } from './Produtos/resp-civil/resp-civil';
import { Apolice } from '../../../models/apolice.model';
import { ClienteService } from '../../../services/cliente.service';
import { ApoliceService } from '../../../services/apolice.service';
import { MatSnackBar } from '@angular/material/snack-bar';

type ItemGroup = FormGroup<{
  id: FormControl<string>;
  produto: FormControl<string>;
  details: FormControl<any>;
}>;

@Component({
  selector: 'app-apolice-form',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatInputModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatSelectModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatIconModule,
    MascaraPipe,
    NgxMaskDirective,
    Automovel,
    Locais,
    RespCivil,
    MatSnackBarModule
  ],
  templateUrl: './apolice-form.html',
  styleUrl: './apolice-form.scss'
})
export class ApoliceForm implements OnInit {
  apoliceForm: FormGroup;
  apoliceId: string | null = null;
  isEditing: boolean = false;
  clienteSearchControl = new FormControl<string | Cliente>('');
  filteredClientes$: Observable<Cliente[]> | undefined;

  // Array com os produtos que são do tipo "locais"
  produtosLocais: string[] = [
    'Residencial',
    'Comercial',
    'Industrial',
    'Rural',
    'Condomínio',
    'Empresarial',
    'Escritório',
    'Loja',
    'Galpão',
    'Fazenda',
    'Sítio'
  ];

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private apoliceService = inject(ApoliceService);
  private clienteService = inject(ClienteService);
  private snackBar = inject(MatSnackBar);

  constructor(
    private route: ActivatedRoute
  ) {
    this.apoliceForm = this.fb.group({
      clienteId: ['', Validators.required],
      clienteNome: ['', Validators.required],
      apolice: ['', Validators.required],
      proposta: ['', Validators.required],
      seguradora: ['', Validators.required],
      produto: ['', Validators.required],
      subTipoDocumento: ['', Validators.required],
      inicioVigencia: [null, Validators.required],
      fimVigencia: [null, Validators.required],
      dataEmissao: [null, Validators.required],
      tipoSeguro: ['', Validators.required],
      situacao: ['', Validators.required],
      formaPagamento: this.fb.group({
        formaPagamento: ['', Validators.required],
        parcelas: [null, [Validators.required, Validators.min(1)]],
        vencimentoPrimeiraParcela: [null, Validators.required],
        comissaoPercentual: [null, [Validators.min(0), Validators.max(100)]], // Percentual de 0 a 100
        premioLiquido: [null, Validators.min(0)],
        iofPercentual: [null, [Validators.min(0), Validators.max(100)]], // Percentual de 0 a 100
        premioTotal: [null, Validators.min(0)]
      }),

      // Item Segurado (subgrupo aninhado, para o Expansion Panel)
      itensSegurados: this.fb.array<ItemGroup>([])
    })
  }

  ngOnInit(): void {
    this.filteredClientes$ = this.clienteSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap((searchValue) => {
        const searchTerm = typeof searchValue === 'string' ? searchValue : '';
        if (!searchTerm || searchTerm.length < 2) {
          return this.clienteService.getClientes().pipe(
            map(clientes => clientes.slice(0, 50))
          );
        }
        return this.clienteService.searchClientes(searchTerm);
      })
    );

    this.apoliceForm.get('produto')?.valueChanges.subscribe((novoProduto: string) => {
      if (novoProduto) {
        this.itensSegurados.controls.forEach(item => {
          item.patchValue({ produto: novoProduto }, { emitEvent: false });
        });

        if (this.itensSegurados.controls.length === 0 && !this.isEditing) {
          this.addItem(novoProduto);
        }
      }
    });


    // Lógica para verificar o modo (criação vs. edição/visualização)
    this.route.paramMap.subscribe(params => {
      this.apoliceId = params.get('id');
      if (this.apoliceId) {
        this.isEditing = true;
        this.loadApoliceData(this.apoliceId);
      } else {
        this.isEditing = false;
        const produtoInicial = this.apoliceForm.get('produto')?.value;
        this.addItem(produtoInicial);
      }
    });
  }

  // displayCliente: Função para exibir o nome do cliente no input do autocomplete.
  // É chamada pelo MatAutocomplete para saber o que mostrar no campo de texto.
  displayCliente(cliente: Cliente | string): string {
    return typeof cliente === 'string' ? cliente : cliente?.nome || '';
  }

  // onClienteSelected: Chamada quando um cliente é selecionado no autocomplete.
  // Atualiza os campos clienteId e clienteNome no FormGroup principal da apólice.
  onClienteSelected(event: any): void {
    const selectedCliente: Cliente = event.source.value;
    this.apoliceForm.patchValue({
      clienteId: selectedCliente.id,
      clienteNome: selectedCliente.nome
    });
    // Opcional: Você pode querer desabilitar o input de busca ou focar em outro campo após a seleção.
  }


  get itensSegurados(): FormArray<ItemGroup> {
    return this.apoliceForm.get('itensSegurados') as FormArray<ItemGroup>;
  }

  get itemGroups(): ItemGroup[] {
    return this.itensSegurados.controls as ItemGroup[];
  }

  // 4) garanta que sua fábrica retorna ItemGroup
  private createItem(produto: string, details: any = {}): ItemGroup {
    return this.fb.group({
      id: this.fb.control<string>(this.newId()),
      produto: this.fb.control<string>(produto, { validators: Validators.required }),
      details: this.fb.control<any>(details, { validators: Validators.required })
    }, { updateOn: 'blur' }) as ItemGroup;
  }

  private newId(): string {
    return (globalThis as any).crypto?.randomUUID?.()
      ?? Math.random().toString(36).slice(2);
  }

  addItem(produto?: string) {
    const base = produto || this.apoliceForm.get('produto')?.value || '';
    if (base) {
      this.itensSegurados.push(this.createItem(base));
    }
  }

  removeItem(i: number) {
    this.itensSegurados.removeAt(i);
  }

  cloneItem(i: number) {
    const { produto, details } = this.itensSegurados.at(i).getRawValue();
    this.itensSegurados.push(this.createItem(produto, details));
  }

  trackById = (_: number, ctrl: AbstractControl) => ctrl.value?.id ?? _;

  // loadApoliceData: Carrega os dados de uma apólice específica do Supabase.
  async loadApoliceData(id: string): Promise<void> {
    this.apoliceService.getApoliceById(id).subscribe({
      next: (apoliceData) => {
        if (apoliceData) {
          this.apoliceForm.patchValue({
            clienteId: apoliceData.clienteId,
            clienteNome: apoliceData.clienteNome,
            apolice: apoliceData.apolice,
            proposta: apoliceData.proposta,
            seguradora: apoliceData.seguradora,
            produto: apoliceData.produto,
            subTipoDocumento: apoliceData.subTipoDocumento,
            inicioVigencia: apoliceData.inicioVigencia instanceof Date 
              ? apoliceData.inicioVigencia.toISOString() 
              : new Date(apoliceData.inicioVigencia).toISOString(),
            fimVigencia: apoliceData.fimVigencia instanceof Date 
              ? apoliceData.fimVigencia 
              : new Date(apoliceData.fimVigencia).toISOString(),
            dataEmissao: apoliceData.dataEmissao instanceof Date 
              ? apoliceData.dataEmissao 
              : new Date(apoliceData.dataEmissao).toISOString(),
            tipoSeguro: apoliceData.tipoSeguro,
            situacao: apoliceData.situacao,
            formaPagamento: apoliceData.formaPagamento ? {
              formaPagamento: apoliceData.formaPagamento.formaPagamento,
              parcelas: apoliceData.formaPagamento.parcelas,
              vencimentoPrimeiraParcela: apoliceData.formaPagamento.vencimentoPrimeiraParcela instanceof Date
                ? apoliceData.formaPagamento.vencimentoPrimeiraParcela
                : new Date(apoliceData.formaPagamento.vencimentoPrimeiraParcela).toISOString(),
              comissaoPercentual: apoliceData.formaPagamento.comissaoPercentual,
              premioLiquido: apoliceData.formaPagamento.premioLiquido,
              iofPercentual: apoliceData.formaPagamento.iofPercentual,
              premioTotal: apoliceData.formaPagamento.premioTotal
            } : {}
          });

          this.clienteSearchControl.setValue(`${apoliceData.clienteNome}`);
          
          if (apoliceData.itensSegurados && Array.isArray(apoliceData.itensSegurados)) {
            this.itensSegurados.clear();
            apoliceData.itensSegurados.forEach((item: any) => {
              const itemGroup = this.createItem(item.produto, item.details);
              itemGroup.patchValue({
                id: item.id,
                produto: item.produto,
                details: item.details
              });
              this.itensSegurados.push(itemGroup);
            });
            console.log(`✅ Carregados ${apoliceData.itensSegurados.length} itens segurados`);
          }
        } else {
          this.snackBar.open('Apólice não encontrada!', 'Fechar', { duration: 3000 });
          this.router.navigate(['/apolices']);
        }
      },
      error: (error) => {
        console.error('Erro ao carregar apólice:', error);
        this.snackBar.open('Erro ao carregar apólice!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/apolices']);
      }
    });
  }

  // onSubmit: Lida com o envio do formulário, seja para criar ou atualizar uma apólice.
  async onSubmit(): Promise<void> {
    if (this.apoliceForm.valid) {
      const apoliceData = {
        ...this.apoliceForm.value,
        itensSegurados: this.itensSegurados.value
      } as Apolice;

      try {
        if (this.isEditing && this.apoliceId) {
          await this.apoliceService.updateApolice(this.apoliceId, apoliceData);
          this.snackBar.open('Apólice atualizada com sucesso!', 'Fechar', { duration: 3000 });
        } else {
          await this.apoliceService.createApolice(apoliceData);
          this.snackBar.open('Nova apólice criada com sucesso!', 'Fechar', { duration: 3000 });
        }
        this.router.navigate(['/apolices']);
      } catch (error) {
        console.error('Erro ao salvar apólice:', error);
        this.snackBar.open('Erro ao salvar apólice. Tente novamente.', 'Fechar', { duration: 3000 });
      }
    } else {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios.', 'Fechar', { duration: 3000 });
      this.apoliceForm.markAllAsTouched();
    }
  }

  // onCancel: Lida com o clique no botão "Cancelar".
  onCancel(): void {
    this.router.navigate(['/apolices']); // Volta para a lista de apólices
  }

  // Método para verificar se o produto atual é do tipo "locais"
  isProdutoLocais(): boolean {
    const produtoAtual = this.apoliceForm.get('produto')?.value;
    return this.produtosLocais.includes(produtoAtual);
  }

  // Método auxiliar para obter um FormControl de um subgrupo
  getControl(groupName: string, controlName: string): FormControl {
    const group = this.apoliceForm.get(groupName) as FormGroup;
    return group.get(controlName) as FormControl;
  }

}
