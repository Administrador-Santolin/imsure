import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RespCivil } from './resp-civil';

describe('RespCivil', () => {
  let component: RespCivil;
  let fixture: ComponentFixture<RespCivil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RespCivil]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RespCivil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
