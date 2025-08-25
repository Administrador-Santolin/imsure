import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiCalculo } from './multi-calculo';

describe('MultiCalculo', () => {
  let component: MultiCalculo;
  let fixture: ComponentFixture<MultiCalculo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiCalculo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiCalculo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
