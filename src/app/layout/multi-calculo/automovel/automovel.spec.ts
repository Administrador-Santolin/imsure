import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Automovel } from './automovel';

describe('Automovel', () => {
  let component: Automovel;
  let fixture: ComponentFixture<Automovel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Automovel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Automovel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
