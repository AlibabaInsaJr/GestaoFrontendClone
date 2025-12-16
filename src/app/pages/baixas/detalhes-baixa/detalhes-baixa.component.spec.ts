import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesBaixaComponent } from './detalhes-baixa.component';

describe('DetalhesBaixaComponent', () => {
  let component: DetalhesBaixaComponent;
  let fixture: ComponentFixture<DetalhesBaixaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesBaixaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesBaixaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
