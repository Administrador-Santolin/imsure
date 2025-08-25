import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, map, Observable, startWith, switchMap } from 'rxjs';
import { Firestore, collection, doc, getDoc, addDoc, updateDoc, query, orderBy, limit, collectionData, where, FirestoreDataConverter, Timestamp } from '@angular/fire/firestore';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';

interface Cliente {
  id?: string;
  nome: string;
  cpf: string;
}

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

// Interface para a Apólice, refletindo a estrutura do seu FormGroup e como será salva no Firestore.
interface Apolice {
  id?: string; // Opcional, pois é gerado pelo Firestore
  clienteId: string;
  clienteNome: string; // Duplicado para facilitar a exibição rápida
  apolice: string;
  proposta: string;
  seguradora: string;
  produto: string;
  subTipoDocumento: string;
  inicioVigencia: Date | Timestamp | null; // Pode ser Date ou Timestamp
  fimVigencia: Date | Timestamp | null;
  dataEmissao: Date | Timestamp | null;
  createdAt?: Date | Timestamp; // Para armazenar a data de criação
  tipoSeguro: string; // Ex: 'novo', 'renovacao'
  situacao: string; // Ex: 'ativo', 'vencido'
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
    // ... outros campos futuros do item segurado
  };
}

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
    MatIconModule
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore
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
      itemSegurado: this.fb.group({
        descricao: [''] // Campo de texto simples por enquanto
        // ... (outros campos do item segurado viriam aqui no futuro)
      })
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
        informacoesFinanceiras: apoliceData.informacoesFinanceiras ? {
          formaPagamento: apoliceData.informacoesFinanceiras.formaPagamento,
          parcelas: apoliceData.informacoesFinanceiras.parcelas,
          // Converta a string de data para objeto Date
          vencimentoPrimeiraParcela:
            apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela instanceof Date
              ? apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela
              : (apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela &&
                typeof (apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela as any).toDate === 'function'
                ? (apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela as any).toDate()
                : (typeof apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela === 'string' || typeof apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela === 'number'
                  ? new Date(apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela)
                  : null)),
          comissaoPercentual: apoliceData.informacoesFinanceiras.comissaoPercentual,
          premioLiquido: apoliceData.informacoesFinanceiras.premioLiquido,
          iofPercentual: apoliceData.informacoesFinanceiras.iofPercentual,
          premioTotal: apoliceData.informacoesFinanceiras.premioTotal
        } : {},
        itemSegurado: apoliceData.itemSegurado || {}
      });

      // Se estamos editando, o campo de busca de cliente precisa mostrar o nome atual.
      // (Isso é importante para quando o usuário abre o formulário de edição)
      this.clienteSearchControl.setValue({ id: apoliceData.clienteId, nome: apoliceData.clienteNome, cpf: '' });

      // Opcional: Se quiser que seja somente leitura até o usuário clicar em "Editar"
      // this.apoliceForm.disable();
    } else {
      console.error('Apólice não encontrada! Redirecionando para a lista de apólices.');
      this.router.navigate(['/dashboard/apolices']); // Redireciona se não encontrar
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

      if (apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela) {
        if (apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela instanceof Date) {
          apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela = Timestamp.fromDate(apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela);
        } else if ((apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela as any).toDate) {
          apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela = (apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela as any).toDate();
        } else {
          apoliceData.informacoesFinanceiras.vencimentoPrimeiraParcela = null;
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
        this.router.navigate(['/dashboard/apolices']); // Redireciona para a lista de apólices
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
    this.router.navigate(['/dashboard/apolices']); // Volta para a lista de apólices
  }

  // Método auxiliar para obter um FormControl de um subgrupo
  getControl(groupName: string, controlName: string): FormControl {
    const group = this.apoliceForm.get(groupName) as FormGroup;
    return group.get(controlName) as FormControl;
  }

}
