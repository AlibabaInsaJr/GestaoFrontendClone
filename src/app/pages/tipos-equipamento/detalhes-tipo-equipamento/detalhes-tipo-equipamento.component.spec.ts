import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesTipoEquipamentoComponent } from './detalhes-tipo-equipamento.component';

describe('DetalhesTipoEquipamentoComponent', () => {
  let component: DetalhesTipoEquipamentoComponent;
  let fixture: ComponentFixture<DetalhesTipoEquipamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesTipoEquipamentoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesTipoEquipamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
