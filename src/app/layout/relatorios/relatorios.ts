import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, map } from 'rxjs';
import { ApoliceService } from '../../services/apolice.service';
import { ClienteService } from '../../services/cliente.service';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Apolice } from '../../models/apolice.model';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatIconModule,
    MatInputModule
  ],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.scss'
})

export class Relatorios implements OnInit {
  relatorioForm: FormGroup;
  private fb = inject(FormBuilder);
  private apoliceService = inject(ApoliceService);
  private clienteService = inject(ClienteService);

  tiposRelatorio = [
    { value: 'apolices', label: 'Relatório de Apólices' },
    { value: 'clientes', label: 'Relatório de Clientes' },
    { value: 'apolicesPorCliente', label: 'Apólices por Cliente' },
    { value: 'apolicesPorSeguradora', label: 'Apólices por Seguradora' }
  ];

  constructor() {
    this.relatorioForm = this.fb.group({
      tipoRelatorio: ['apolices', Validators.required],
      dataInicio: [null],
      dataFim: [null],
      seguradora: [''],
      situacao: [''],
      clienteId: ['']
    });
  }

  ngOnInit(): void {
  }

  async gerarRelatorio(): Promise<void> {
    const tipoRelatorio = this.relatorioForm.get('tipoRelatorio')?.value;
    const filtros = this.relatorioForm.value;

    try {
      switch (tipoRelatorio) {
        case 'apolices':
          await this.gerarRelatorioApolices(filtros);
          break;
        case 'clientes':
          await this.gerarRelatorioClientes(filtros);
          break;
        case 'apolicesPorCliente':
          await this.gerarRelatorioApolicesPorCliente(filtros);
          break;
        case 'apolicesPorSeguradora':
          await this.gerarRelatorioApolicesPorSeguradora(filtros);
          break;
        default:
          alert('Tipo de relatório não implementado');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório. Verifique o console para mais detalhes.');
    }
  }

  private async gerarRelatorioApolices(filtros: any): Promise<void> {
    const filters = {
      dataEmissaoStart: filtros.dataInicio,
      dataEmissaoEnd: filtros.dataFim,
      seguradora: filtros.seguradora,
      situacao: filtros.situacao
    };

    this.apoliceService.getApolices(filters, { active: 'dataEmissao', direction: 'desc' })
      .subscribe(apolices => {
        this.criarPDFApolices(apolices, filtros);
      });
  }

  private async gerarRelatorioClientes(filtros: any): Promise<void> {
    this.clienteService.getClientes().subscribe(clientes => {
      this.criarPDFClientes(clientes);
    });
  }

  private async gerarRelatorioApolicesPorCliente(filtros: any): Promise<void> {
    const filters: any = {};
    if (filtros.clienteId) {
      filters.clienteId = filtros.clienteId;
    }

    this.apoliceService.getApolices(filters, { active: 'clienteNome', direction: 'asc' })
      .pipe(
        map(apolices => {
          if (filtros.clienteId) {
            return apolices.filter(ap => ap.clienteId === filtros.clienteId);
          }
          return apolices;
        })
      )
      .subscribe(apolices => {
        this.criarPDFApolicesPorCliente(apolices);
      });
  }

  private async gerarRelatorioApolicesPorSeguradora(filtros: any): Promise<void> {
    this.apoliceService.getApolices({}, { active: 'seguradora', direction: 'asc' })
      .subscribe(apolices => {
        this.criarPDFApolicesPorSeguradora(apolices);
      });
  }

  private criarPDFApolices(apolices: Apolice[], filtros: any): void {
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Apólices', 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    if (filtros.dataInicio && filtros.dataFim) {
      doc.text(
        `Período: ${filtros.dataInicio.toLocaleDateString('pt-BR')} a ${filtros.dataFim.toLocaleDateString('pt-BR')}`,
        14,
        36
      );
    }

    if (filtros.seguradora) {
      doc.text(`Seguradora: ${filtros.seguradora}`, 14, 42);
    }

    if (filtros.situacao) {
      doc.text(`Situação: ${filtros.situacao}`, 14, 48);
    }

    // Tabela
    const tableData = apolices.map(ap => [
      ap.apolice || '',
      ap.clienteNome || '',
      ap.seguradora || '',
      ap.produto || '',
      ap.dataEmissao ? this.formatarData(ap.dataEmissao) : '',
      ap.situacao || '',
      ap.formaPagamento?.premioTotal ? `R$ ${ap.formaPagamento.premioTotal.toFixed(2)}` : 'R$ 0,00'
    ]);

    autoTable(doc, {
      head: [['Apólice', 'Cliente', 'Seguradora', 'Produto', 'Data Emissão', 'Situação', 'Prêmio Total']],
      body: tableData,
      startY: filtros.dataInicio || filtros.seguradora || filtros.situacao ? 55 : 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY || 20;
    doc.setFontSize(8);
    doc.text(`Total de apólices: ${apolices.length}`, 14, finalY + 10);

    doc.save(`relatorio-apolices-${new Date().getTime()}.pdf`);
  }

  private criarPDFClientes(clientes: Cliente[]): void {
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Relatório de Clientes', 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    // Tabela
    const tableData = clientes.map(cliente => [
      cliente.nome || '',
      cliente.cpf || '',
      cliente.email || '',
      cliente.telefone || '',
      cliente.endereco ? `${cliente.endereco.cidade}/${cliente.endereco.estado}` : ''
    ]);

    autoTable(doc, {
      head: [['Nome', 'CPF', 'E-mail', 'Telefone', 'Cidade/Estado']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    // Rodapé
    const finalY = (doc as any).lastAutoTable.finalY || 20;
    doc.setFontSize(8);
    doc.text(`Total de clientes: ${clientes.length}`, 14, finalY + 10);

    doc.save(`relatorio-clientes-${new Date().getTime()}.pdf`);
  }

  private criarPDFApolicesPorCliente(apolices: Apolice[]): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Apólices por Cliente', 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    // Agrupar por cliente
    const agrupado = apolices.reduce((acc, ap) => {
      const cliente = ap.clienteNome || 'Sem nome';
      if (!acc[cliente]) {
        acc[cliente] = [];
      }
      acc[cliente].push(ap);
      return acc;
    }, {} as Record<string, Apolice[]>);

    let startY = 40;
    Object.keys(agrupado).forEach((cliente, index) => {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(12);
      doc.text(cliente, 14, startY);

      const tableData = agrupado[cliente].map(ap => [
        ap.apolice || '',
        ap.seguradora || '',
        ap.produto || '',
        ap.dataEmissao ? this.formatarData(ap.dataEmissao) : '',
        ap.situacao || ''
      ]);

      autoTable(doc, {
        head: [['Apólice', 'Seguradora', 'Produto', 'Data Emissão', 'Situação']],
        body: tableData,
        startY: startY + 5,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 200, 200] }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`relatorio-apolices-por-cliente-${new Date().getTime()}.pdf`);
  }

  private criarPDFApolicesPorSeguradora(apolices: Apolice[]): void {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Apólices por Seguradora', 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

    // Agrupar por seguradora
    const agrupado = apolices.reduce((acc, ap) => {
      const seguradora = ap.seguradora || 'Sem seguradora';
      if (!acc[seguradora]) {
        acc[seguradora] = [];
      }
      acc[seguradora].push(ap);
      return acc;
    }, {} as Record<string, Apolice[]>);

    let startY = 40;
    Object.keys(agrupado).forEach((seguradora) => {
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(12);
      doc.text(`${seguradora} (${agrupado[seguradora].length} apólices)`, 14, startY);

      const tableData = agrupado[seguradora].map(ap => [
        ap.apolice || '',
        ap.clienteNome || '',
        ap.produto || '',
        ap.dataEmissao ? this.formatarData(ap.dataEmissao) : '',
        ap.situacao || ''
      ]);

      autoTable(doc, {
        head: [['Apólice', 'Cliente', 'Produto', 'Data Emissão', 'Situação']],
        body: tableData,
        startY: startY + 5,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [200, 200, 200] }
      });

      startY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`relatorio-apolices-por-seguradora-${new Date().getTime()}.pdf`);
  }

  private formatarData(data: Date | any): string {
    if (!data) return '';
    const date = data instanceof Date ? data : new Date(data);
    return date.toLocaleDateString('pt-BR');
  }
}
