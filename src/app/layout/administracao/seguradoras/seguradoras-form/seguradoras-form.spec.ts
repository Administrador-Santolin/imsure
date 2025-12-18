import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguradorasForm } from './seguradoras-form';

describe('SeguradorasForm', () => {
  let component: SeguradorasForm;
  let fixture: ComponentFixture<SeguradorasForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguradorasForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeguradorasForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
