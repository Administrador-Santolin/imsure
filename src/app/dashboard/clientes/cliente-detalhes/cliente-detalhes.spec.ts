import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteDetalhes } from './cliente-detalhes';

describe('ClienteDetalhes', () => {
  let component: ClienteDetalhes;
  let fixture: ComponentFixture<ClienteDetalhes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteDetalhes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteDetalhes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
