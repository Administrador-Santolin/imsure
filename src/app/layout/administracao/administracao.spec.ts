import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Administracao } from './administracao';

describe('Administracao', () => {
  let component: Administracao;
  let fixture: ComponentFixture<Administracao>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Administracao]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Administracao);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
