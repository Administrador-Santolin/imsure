import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProdutosForm } from './produtos-form';

describe('ProdutosForm', () => {
  let component: ProdutosForm;
  let fixture: ComponentFixture<ProdutosForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutosForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProdutosForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
