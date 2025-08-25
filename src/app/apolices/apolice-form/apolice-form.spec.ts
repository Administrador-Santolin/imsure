import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApoliceForm } from './apolice-form';

describe('ApoliceForm', () => {
  let component: ApoliceForm;
  let fixture: ComponentFixture<ApoliceForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApoliceForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApoliceForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
