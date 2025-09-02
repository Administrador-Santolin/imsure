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

import { Firestore, collection, doc, getDoc, addDoc, updateDoc, query, orderBy, limit, collectionData, FirestoreDataConverter, Timestamp } from '@angular/fire/firestore';
import { Cliente } from '../../../models/cliente.model';
import { MascaraPipe } from '../../../mascara-pipe';
import { NgxMaskDirective } from 'ngx-mask';
import { Automovel } from './Produtos/automovel/automovel';
import { Locais } from './Produtos/locais/locais';
import { RespCivil } from './Produtos/resp-civil/resp-civil';
import { Apolice } from '../../../models/apolice.model';

// Converte os dados do Firestore para o formato da Interface Cliente.
// Isso é útil para garantir que os dados lidos do banco correspondam à nossa tipagem.
const clienteConverter: FirestoreDataConverter<Cliente> = {
  toFirestore: (cliente: Cliente) => {
    // Ao salvar no Firestore, removemos o ID pois ele já é o ID do documento.
    const { id, ...data } = cliente;

    return data;
  },
  fromFirestore: (snapshot: any, options: any) => {
    // Ao ler do Firestore, pegamos o ID do snapshot e os dados do documento.
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      nome: data.nome,
      cpf: data.cpf || '' // Garante que cpf sempre exista, mesmo se vazio no banco
    } as Cliente;
  }
};

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
    RespCivil
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
  private firestore = inject(Firestore);

  constructor(
    private route: ActivatedRoute
  ) {
    this.apoliceForm = this.fb.group({
      clienteId: ['', Validators.required],
      // clienteNome: Armazena o nome do cliente. Será desnormalizado para exibição fácil.
      clienteNome: ['', Validators.required],
      apolice: ['', Validators.required],
      proposta: ['', Validators.required],
      seguradora: ['', Validators.required],
      produto: ['', Validators.required],
      subTipoDocumento: ['', Validators.required],
      inicioVigencia: [null, Validators.required],
      fimVigencia: [null, Validators.required],
      dataEmissao: [null, Validators.required],
      tipoSeguro: ['', Validators.required], // Radio group: 'novo', 'renovacao', 'renovacaoOutra'
      situacao: ['', Validators.required], // Radio group: 'ativo', 'vencido', etc.

      // Informações Financeiras (subgrupo aninhado, para o Expansion Panel)
      informacoesFinanceiras: this.fb.group({
        formaPagamento: ['', Validators.required],
        parcelas: [null, [Validators.required, Validators.min(1)]],
        vencimentoPrimeiraParcela: [null, Validators.required],
        comissaoPercentual: [null, [Validators.min(0), Validators.max(100)]], // Percentual de 0 a 100
        premioLiquido: [null, Validators.min(0)],
        iofPercentual: [null, [Validators.min(0), Validators.max(100)]], // Percentual de 0 a 100
        premioTotal: [null, Validators.min(0)]
      }),

      // Item Segurado (subgrupo aninhado, para o Expansion Panel)
      itensSegurados: this.fb.array([])
    })
  }

  ngOnInit(): void {
    this.filteredClientes$ = this.clienteSearchControl.valueChanges.pipe(
      startWith(''), // Começa com uma string vazia para exibir todos os clientes iniciais
      debounceTime(300), // Espera 300ms após a última digitação
      // Primeiro, busca um número limitado de clientes do Firestore (sem filtros complexos)
      switchMap(() => { // Não precisamos do 'value' aqui, pois o filtro é local
        const clientesCollectionRef = collection(this.firestore, 'clientes').withConverter(clienteConverter);
        // Ajuste o limit(50) se precisar de mais ou menos clientes pré-carregados
        return collectionData(query(clientesCollectionRef, orderBy('nome'), limit(50))) as Observable<Cliente[]>;
      }),
      // Em seguida, aplica o filtro localmente no cliente
      map(clientes => {
        const searchValue = this.clienteSearchControl.value;
        const searchTerm = typeof searchValue === 'string' ? searchValue.toLowerCase() : ''; // Pega o texto atual do input

        if (!searchTerm) {
          return clientes; // Se o input estiver vazio, retorna todos os clientes buscados inicialmente
        }

        return clientes.filter(cliente =>
          cliente.nome.toLowerCase().includes(searchTerm) || // Busca por nome (case-insensitive, "contém")
          (cliente.cpf && cliente.cpf.toLowerCase().includes(searchTerm)) // Busca por CPF (case-insensitive, "contém")
        );
      })
    );

    // Lógica para verificar o modo (criação vs. edição/visualização)
    this.route.paramMap.subscribe(params => {
      this.apoliceId = params.get('id');
      if (this.apoliceId) {
        this.isEditing = true;
        this.loadApoliceData(this.apoliceId);
      } else {
        this.isEditing = false;
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


  get itensSegurados(): FormArray {
    return this.apoliceForm.get('itensSegurados') as FormArray<FormGroup>;
  }

  private newId(): string {
    return (globalThis as any).crypto?.randomUUID?.()
      ?? Math.random().toString(36).slice(2);
  }

  private createItem(produto: string, details: any = {}): FormGroup {
    return this.fb.group({
      id: [this.newId()],
      produto: [produto, Validators.required],
      details: [details, Validators.required]
    }, {updateOn: 'blur'});
  }

  addItem(produto?: string) {
    const base = produto || this.apoliceForm.get('produto')?.value || '';
    this.itensSegurados.push(this.createItem(base));
  }

  removeItem(i: number) {
    this.itensSegurados.removeAt(i);
  }

  cloneItem(i: number) {
    const {produto, details } = this.itensSegurados.at(i).getRawValue();
    this.itensSegurados.push(this.createItem(produto, details)); 
  }

  trackById = (_: number, ctrl: AbstractControl) => ctrl.value?.id ?? _;

  // loadApoliceData: Carrega os dados de uma apólice específica do Firestore.
  // É chamada quando o formulário está no modo de edição/visualização.
  async loadApoliceData(id: string): Promise<void> {
    const apoliceDocRef = doc(this.firestore, `apolices/${id}`); // Cria uma referência ao documento da apólice
    const docSnap = await getDoc(apoliceDocRef); // Tenta buscar o documento

    if (docSnap.exists()) {
      // Se o documento existe, pega os dados e preenche o formulário.
      const apoliceData = docSnap.data() as Apolice;

      // Importante: MatDatepicker usa objetos Date, mas o Firestore salva timestamps ou strings.
      // É preciso converter de volta para Date se necessário.
      // Se o Firestore salva como timestamp (Firebase Timestamp), você faria:
      // apoliceData.inicioVigencia = apoliceData.inicioVigencia ? apoliceData.inicioVigencia.toDate() : null;
      // ... e para outros campos de data.
      // Por simplicidade, assumindo que já está em um formato que o MatDatepicker aceita ou será convertido na leitura.
      // Se salvar como string, você pode fazer: new Date(apoliceData.inicioVigencia as string)

      this.apoliceForm.patchValue({
        // Preenche os campos principais
        clienteId: apoliceData.clienteId,
        clienteNome: apoliceData.clienteNome,
        apolice: apoliceData.apolice,
        proposta: apoliceData.proposta,
        seguradora: apoliceData.seguradora,
        produto: apoliceData.produto,
        subTipoDocumento: apoliceData.subTipoDocumento,
        // Converta as strings de data para objetos Date
        inicioVigencia: apoliceData.inicioVigencia instanceof Date
          ? apoliceData.inicioVigencia
          : (apoliceData.inicioVigencia && typeof (apoliceData.inicioVigencia as any).toDate === 'function'
            ? (apoliceData.inicioVigencia as any).toDate()
            : (typeof apoliceData.inicioVigencia === 'string' || typeof apoliceData.inicioVigencia === 'number'
              ? new Date(apoliceData.inicioVigencia)
              : null)),
        fimVigencia: apoliceData.fimVigencia instanceof Date
          ? apoliceData.fimVigencia
          : (apoliceData.fimVigencia && typeof (apoliceData.fimVigencia as any).toDate === 'function'
            ? (apoliceData.fimVigencia as any).toDate()
            : (typeof apoliceData.fimVigencia === 'string' || typeof apoliceData.fimVigencia === 'number'
              ? new Date(apoliceData.fimVigencia)
              : null)),
        dataEmissao: apoliceData.dataEmissao instanceof Date
          ? apoliceData.dataEmissao
          : (apoliceData.dataEmissao && typeof (apoliceData.dataEmissao as any).toDate === 'function'
            ? (apoliceData.dataEmissao as any).toDate()
            : (typeof apoliceData.dataEmissao === 'string' || typeof apoliceData.dataEmissao === 'number'
              ? new Date(apoliceData.dataEmissao)
              : null)),
        tipoSeguro: apoliceData.tipoSeguro,
        situacao: apoliceData.situacao,

        // Preenche os subgrupos
        informacoesFinanceiras: apoliceData.formaPagamento ? {
          formaPagamento: apoliceData.formaPagamento.formaPagamento,
          parcelas: apoliceData.formaPagamento.parcelas,
          // Converta a string de data para objeto Date
          vencimentoPrimeiraParcela:
            apoliceData.formaPagamento.vencimentoPrimeiraParcela instanceof Date
              ? apoliceData.formaPagamento.vencimentoPrimeiraParcela
              : (apoliceData.formaPagamento.vencimentoPrimeiraParcela &&
                typeof (apoliceData.formaPagamento.vencimentoPrimeiraParcela as any).toDate === 'function'
                ? (apoliceData.formaPagamento.vencimentoPrimeiraParcela as any).toDate()
                : (typeof apoliceData.formaPagamento.vencimentoPrimeiraParcela === 'string' || typeof apoliceData.formaPagamento.vencimentoPrimeiraParcela === 'number'
                  ? new Date(apoliceData.formaPagamento.vencimentoPrimeiraParcela)
                  : null)),
          comissaoPercentual: apoliceData.formaPagamento.comissaoPercentual,
          premioLiquido: apoliceData.formaPagamento.premioLiquido,
          iofPercentual: apoliceData.formaPagamento.iofPercentual,
          premioTotal: apoliceData.formaPagamento.premioTotal
        } : {},
        itemSegurado: apoliceData.itemSegurado || {}
      });

      // Se estamos editando, o campo de busca de cliente precisa mostrar o nome atual.
      // (Isso é importante para quando o usuário abre o formulário de edição)
      this.clienteSearchControl.setValue(`${apoliceData.clienteNome}`);

      // Opcional: Se quiser que seja somente leitura até o usuário clicar em "Editar"
      // this.apoliceForm.disable();
    } else {
      console.error('Apólice não encontrada! Redirecionando para a lista de apólices.');
      this.router.navigate(['/apolices']); // Redireciona se não encontrar
    }
  }

  // onSubmit: Lida com o envio do formulário, seja para criar ou atualizar uma apólice.
  async onSubmit(): Promise<void> {
    if (this.apoliceForm.valid) {
      // Pega os valores do formulário.
      const apoliceData = this.apoliceForm.value as Apolice;

      // Limpa o ID se estiver criando, para o Firestore gerar um novo.
      if (!this.isEditing) {
        delete apoliceData.id;
      }

      // Converte objetos Date de volta para string ISO ou Timestamp antes de salvar no Firestore.
      // O Firestore aceita objetos Date nativos do JS, mas salva como Timestamp.
      if (apoliceData.inicioVigencia instanceof Date) {
        apoliceData.inicioVigencia = Timestamp.fromDate(apoliceData.inicioVigencia);
      } else if (apoliceData.inicioVigencia && (apoliceData.inicioVigencia as any).toDate) {
        apoliceData.inicioVigencia = (apoliceData.inicioVigencia as any).toDate();
      } else {
        apoliceData.inicioVigencia = null;
      }

      if (apoliceData.fimVigencia instanceof Date) {
        apoliceData.fimVigencia = Timestamp.fromDate(apoliceData.fimVigencia);
      } else if (apoliceData.fimVigencia && (apoliceData.fimVigencia as any).toDate) {
        apoliceData.fimVigencia = (apoliceData.fimVigencia as any).toDate();
      } else {
        apoliceData.fimVigencia = null;
      }

      if (apoliceData.dataEmissao instanceof Date) {
        apoliceData.dataEmissao = Timestamp.fromDate(apoliceData.dataEmissao);
      } else if (apoliceData.dataEmissao && (apoliceData.dataEmissao as any).toDate) {
        apoliceData.dataEmissao = (apoliceData.dataEmissao as any).toDate();
      } else {
        apoliceData.dataEmissao = null;
      }

      if (apoliceData.formaPagamento.vencimentoPrimeiraParcela) {
        if (apoliceData.formaPagamento.vencimentoPrimeiraParcela instanceof Date) {
          apoliceData.formaPagamento.vencimentoPrimeiraParcela = Timestamp.fromDate(apoliceData.formaPagamento.vencimentoPrimeiraParcela);
        } else if ((apoliceData.formaPagamento.vencimentoPrimeiraParcela as any).toDate) {
          apoliceData.formaPagamento.vencimentoPrimeiraParcela = (apoliceData.formaPagamento.vencimentoPrimeiraParcela as any).toDate();
        } else {
          apoliceData.formaPagamento.vencimentoPrimeiraParcela = null;
        }
      }

      if (!this.isEditing) {
        apoliceData.createdAt = new Date(); // Define a data de criação apenas para novas apólices
      }

      try {
        if (this.isEditing && this.apoliceId) {
          // Se estiver editando, atualiza o documento existente.
          const apoliceDocRef = doc(this.firestore, `apolices/${this.apoliceId}`);
          await updateDoc(apoliceDocRef, apoliceData as any); // 'as any' para evitar erro de tipo com o ID
          console.log('Apólice atualizada com sucesso!');
        } else {
          // Se estiver criando, adiciona um novo documento.
          const apolicesCollection = collection(this.firestore, 'apolices');
          await addDoc(apolicesCollection, apoliceData as any); // 'as any' para evitar erro de tipo com o ID
          console.log('Apólice adicionada com sucesso!');
        }
        this.router.navigate(['/apolices']); // Redireciona para a lista de apólices
      } catch (error) {
        console.error('Erro ao salvar apólice:', error);
        // Implementar MatSnackBar para feedback ao usuário
      }
    } else {
      console.warn('Formulário inválido. Verifique os campos.');
      // Opcional: Marcar todos os campos como "touched" para exibir mensagens de validação
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
