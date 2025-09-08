import { Injectable } from "@angular/core";
import { collectionData, Firestore } from "@angular/fire/firestore";
import { Cliente, Endereco } from "../models/cliente.model";
import { Observable, of } from "rxjs";
import { collection, FirestoreDataConverter, limit, orderBy, query, where } from "firebase/firestore";

const clienteConverter: FirestoreDataConverter<Cliente> = {
    toFirestore: (cliente: Cliente) => {
      const { id, ...data } = cliente;
      return data;
    },
    fromFirestore: (snapshot: any, options: any) => {
      const data = snapshot.data(options);

      const endereco: Endereco = {
        cep: data.endereco.cep,
        rua: data.endereco.rua,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento,
        bairro: data.endereco.bairro,
        cidade: data.endereco.cidade,
        estado: data.endereco.estado
      }

      return {
        id: snapshot.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        cpf: data.cpf || '',
        endereco: endereco,
        dataNascimento: data.dataNascimento || ''
      } as Cliente;
    }
  };

@Injectable({ providedIn: 'root' })
export class ClienteService {
    constructor(private firestore: Firestore) { }


    searchClientes(searchText: string): Observable<Cliente[]> {
        const clientesCollectionRef = collection(this.firestore, 'clientes').withConverter(clienteConverter);

        if (!searchText || searchText.length < 2) {
            return of([]);
        }

        // Busca simples por nome (mais eficiente)
        const queryRef = query(
            clientesCollectionRef,
            orderBy('nome'),
            where('nome', '>=', searchText.toLowerCase()),
            where('nome', '<=', searchText.toLowerCase() + '\uf8ff'),
            limit(10)
        );

        return collectionData(queryRef) as Observable<Cliente[]>;

    }
}