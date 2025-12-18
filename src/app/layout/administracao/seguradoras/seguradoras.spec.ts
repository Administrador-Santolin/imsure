import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Seguradoras } from './seguradoras';

describe('Seguradoras', () => {
  let component: Seguradoras;
  let fixture: ComponentFixture<Seguradoras>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Seguradoras]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Seguradoras);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
