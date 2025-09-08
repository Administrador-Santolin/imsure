ngOnInit() {
  this.filteredClientes$ = this.searchControl.valueChanges.pipe(
    startWith(''),
    debounceTime(300), // Espera 300ms antes de buscar
    distinctUntilChanged(), // Só busca se o texto mudou
    switchMap(searchText => {
      if (!searchText || searchText.length < 2) {
        return of([]); // Não busca se menos de 2 caracteres
      }
      return this.searchClientes(searchText);
    })
  );
}


//Como estava
ngOnInit() {
    this.filteredClientes$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      // Use switchMap para buscar todos os clientes relevantes do Firestore
      distinctUntilChanged(),
      switchMap(value => {
        const clientesCollectionRef = collection(this.firestore, 'clientes').withConverter(clienteConverter);
        // Buscamos um número limitado de clientes (ex: 50) ordenados por nome
        // Não usamos cláusulas 'where' de intervalo aqui para simplificar a busca inicial no Firestore
        // e evitar problemas de índice complexos.
        return collectionData(query(clientesCollectionRef, orderBy('nome'), limit(50))) as Observable<Cliente[]>;
      }),
      // Agora, aplicamos o filtro localmente no cliente
      map(clientes => {
        const searchText = this.searchControl.value?.toLowerCase() || ''; // Pega o texto atual do input
        if (!searchText) {
          return clientes; // Se o input estiver vazio, retorna todos os clientes buscados inicialmente
        }
        return clientes.filter(cliente =>
          cliente.nome.toLowerCase().includes(searchText) || // Busca por nome (case-insensitive, "contém")
          (cliente.cpf && cliente.cpf.toLowerCase().includes(searchText)) // Busca por CPF (case-insensitive, "contém")
        );
      })
    );
  }
